"use client";

import { PageHeader } from "@/src/components/page-header";
import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Link, useRouter } from "@/src/i18n/navigation";
import { formatDate } from "@/src/lib/date";
import type { Locale } from "@/src/types/locale";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "sonner";
import useAsync from "@/src/hooks/use-async";
import {
  getCarSubmissionVehicle,
  uploadCarSubmissionFiles,
  markSeenCarSubmissionVehicle,
  getCarSubmissionClasses,
} from "@/src/features/cars/submission/api/submission.service";
import { logger } from "@/src/lib/logger";
import {
  REVIEW_STATUSES,
  SUBMISSION_STATUS_LABELS,
  submissionVehicleName,
  type CarSubmission,
  type SubmissionStatus,
} from "@/src/features/cars/submission/submission.types";
import { SubmissionStatusBadge } from "../components/submission-status-badge";
import {
  emptyReviewFormValues,
  reviewFormValuesFromSubmission,
} from "./submission-review.helpers";

import {
  submissionReviewSchema,
  type SubmissionReviewFormValues,
} from "./submission-review.schema";
import { CarDetailsCard } from "@/src/features/cars/submission/review/components/car-details-card";
import { InternalCommentsCard } from "@/src/features/cars/submission/review/components/internal-comments-card";
import { ReviewDecisionCard } from "@/src/features/cars/submission/review/components/review-decision-card";
import { saveCarSubmissionAction } from "./submission-review.actions";
import type { SubmissionUploads } from "./submission-review.types";
import NavigationButton from "@/src/components/navigation-button";
import Text from "@/src/components/ui/text";
import { downloadSubmissionForm } from "../submission-download";

function documentsForSave(values: SubmissionReviewFormValues) {
  return [
    ...values.documents,
    ...values.documentFiles.map((file) => ({
      id: `temp-document-${crypto.randomUUID()}`,
      name: file.name,
      url: "pending-upload",
    })),
  ];
}

function pendingImageFiles(
  values: SubmissionReviewFormValues,
  filesById: ReadonlyMap<string, File>,
) {
  return values.images.flatMap((image) => {
    const file = filesById.get(image.id);
    return file ? [file] : [];
  });
}

export function SubmissionReviewClient({ carId }: { carId: string }) {
  const router = useRouter();
  const modal = useModal();
  const { isLoading, execute } = useAsync(true);
  const { isLoading: isDownloading, execute: executeDownload } = useAsync();
  const [submission, setSubmission] = useState<CarSubmission | null>(null);

  const form = useForm<SubmissionReviewFormValues>({
    defaultValues: emptyReviewFormValues(),
    resolver: zodResolver(submissionReviewSchema),
    shouldUnregister: false,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const {
    clearErrors,
    control,
    formState,
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = form;

  const draft = watch();

  const initialSubmissionRef = useRef(submission);
  const pendingValuesRef = useRef<SubmissionReviewFormValues | null>(null);
  const pendingFilesRef = useRef(new Map<string, File>());
  const [editLocale, setEditLocale] = useState<Locale>("en");
  const [showMessageComposer, setShowMessageComposer] = useState(false);

  // Mark seen submission
  useEffect(() => {
    (async () => {
      try {
        await markSeenCarSubmissionVehicle(carId);
      } catch (error) {
        logger.debug("[MARK-SEEN]", "Mark seen error", {
          error: String(error),
        });
      }
    })();
  }, [carId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await execute(async () => getCarSubmissionVehicle(carId));

        const nextSubmission = { ...data, seen: true };

        setSubmission(nextSubmission);
        pendingFilesRef.current.clear();
        reset(reviewFormValuesFromSubmission(nextSubmission));
        initialSubmissionRef.current = nextSubmission;
      } catch (fetchError) {
        logger.debug("CAR-SUBMISSIONS", "Failed to fetch submission", {
          carId,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
        });
        pendingFilesRef.current.clear();
        setSubmission(null);
        reset(emptyReviewFormValues());
      }
    })();
  }, [carId, execute, reset]);

  const statusOptions = useMemo(
    () =>
      REVIEW_STATUSES.map((item) => ({
        label: SUBMISSION_STATUS_LABELS[item],
        value: item,
      })),
    [],
  );

  if (isLoading) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href="/app/cars/submissions">
            <ChevronLeft className="size-4" /> Back to submissions
          </Link>
        </Button>
        <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
          Loading submission...
        </Card>
      </>
    );
  }

  if (!submission) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
          <Link href="/app/cars/submissions">
            <ChevronLeft className="size-4" /> Back to submissions
          </Link>
        </Button>
        <Card className="flex h-48 items-center justify-center text-sm text-muted-foreground shadow-none">
          This submission could not be found.
        </Card>
      </>
    );
  }

  const currentDraft = draft;
  const liveStatus = submission.status;
  const isArchived = currentDraft.status === "archived";
  const willSaveStatus: SubmissionStatus =
    currentDraft.status === "requested_info" &&
    liveStatus === "info_received" &&
    !currentDraft.newInfoMessage.trim()
      ? "info_received"
      : currentDraft.status;
  const statusChanged = willSaveStatus !== liveStatus;

  async function handleDownloadSubmissionForm() {
    executeDownload<[string], void>(async (id) => {
      await Promise.all([
        getCarSubmissionVehicle(id),
        getCarSubmissionClasses(),
      ])
        .then(([car, classes]) => downloadSubmissionForm(car, classes))
        .catch((error) => {
          console.log("error", error);
          toast.error("Couldn’t prepare the download", {
            description: "Please try again.",
          });
        });
    }, carId);
  }

  async function commitSave() {
    if (!submission) return;

    const values = pendingValuesRef.current ?? getValues();
    const message = values.newInfoMessage.trim();

    try {
      const documents = documentsForSave(values);
      const imageFiles = pendingImageFiles(values, pendingFilesRef.current);
      const uploadedFiles = await uploadCarSubmissionFiles(
        {
          documents: values.documentFiles,
          images: imageFiles,
        },
        {
          formId: submission.formId,
          submissionId: submission.id,
        },
      );
      const uploads: SubmissionUploads = uploadedFiles;
      const {
        emailAttempted,
        emailSent,
        finalStatus,
        submission: savedSubmission,
      } = await saveCarSubmissionAction(submission.id, {
        expectedUpdatedAt: submission.lastUpdated,
        formId: submission.formId,
        uploads,
        values: { ...values, documentFiles: [], documents },
      });

      // Free memory url cause of URL.createObjectURL(file) that use for render image
      values.images.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });

      setSubmission(savedSubmission);
      reset(reviewFormValuesFromSubmission(savedSubmission));
      pendingValuesRef.current = null;
      pendingFilesRef.current.clear();
      setShowMessageComposer(false);

      modal.close();

      toast.success(
        finalStatus === liveStatus
          ? "Submission saved"
          : `Status changed to ${SUBMISSION_STATUS_LABELS[finalStatus]}`,
        {
          description:
            finalStatus === "approved"
              ? "The car has moved out of the submissions queue."
              : message
                ? "The request has been added to the owner message log."
                : "Submission data has been updated.",
        },
      );

      if (emailAttempted && !emailSent) {
        toast.warning("Submission saved, but email was not sent", {
          description: "The status is updated. Please retry the notification.",
        });
      }
    } catch (saveError) {
      logger.error("CAR-SUBMISSIONS", "Failed to save submission", {
        carId,
        error:
          saveError instanceof Error ? saveError.message : String(saveError),
      });
      toast.error("Could not save submission", {
        description:
          saveError instanceof Error &&
          saveError.message.includes("changed by another reviewer")
            ? saveError.message
            : "Your changes are still on screen. Try again.",
      });
    }
  }

  const requestSave: SubmitHandler<SubmissionReviewFormValues> = (values) => {
    pendingValuesRef.current = structuredClone(values);

    const hasLanguageGap =
      Boolean(values.history.en.trim()) !== Boolean(values.history.it.trim());
    const warnLanguage = values.status === "approved" && hasLanguageGap;

    modal.preventBackdropClose();
    modal.open({
      headerClassName: "border-0 px-4 py-0 pt-4",
      header: (
        <div className="pr-8">
          <h2 className="font-heading text-xl">
            {warnLanguage
              ? "Vehicle history has one language"
              : "Save changes?"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {warnLanguage
              ? "You can complete the missing translation before approval, or save it and return later."
              : "Your changes to this submission will be saved and take effect right away."}
          </p>
        </div>
      ),
      footer: ({ loading, run }) => (
        <>
          <Button variant="outline" onClick={modal.close}>
            Cancel
          </Button>
          {warnLanguage ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditLocale(values.history.en.trim() ? "it" : "en");
                pendingValuesRef.current = null;
                modal.close();
              }}
            >
              Fix content
            </Button>
          ) : null}
          <Button
            loading={loading}
            onClick={() => void run(async () => commitSave())}
          >
            {warnLanguage ? "Save anyway" : "Save changes"}
          </Button>
        </>
      ),
    });
  };

  const handleInvalid: SubmitErrorHandler<SubmissionReviewFormValues> = (
    errors,
  ) => {
    if (errors.history?.en) {
      setEditLocale("en");
    }

    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        '[aria-invalid="true"]',
      );
      if (!target) return;

      target.scrollIntoView({ block: "center" });
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        target.focus({ preventScroll: true });
      }
    });
  };

  const hancleConfirmCancel = () => {
    if (formState.isDirty) {
      modal.open({
        className: "gap-1.5",
        headerClassName: "border-0 px-4 py-0 pt-4",
        header: (
          <Text.FormTitle size="base" className="font-medium">
            Discard your changes?
          </Text.FormTitle>
        ),
        contentClassName: "px-4 gap-0",
        content: (
          <Text size="sm" color="muted-foreground">
            You’ve edited this submission but haven’t saved yet. If you leave
            now, these changes will be lost.
          </Text>
        ),
        footer: (
          <>
            <Button variant="outline" onClick={() => modal.close()}>
              Keep edition
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                router.push("/app/cars/submissions");
                modal.close();
              }}
            >
              Discard changes
            </Button>
          </>
        ),
      });
    } else {
      router.push("/app/cars/submissions");
    }
  };

  return (
    <>
      <NavigationButton
        text="Back to submissions"
        onClick={hancleConfirmCancel}
      />

      <PageHeader
        title={submissionVehicleName(submission)}
        description={`${submission.carId} · Submitted ${formatDate(
          submission.submissionDate,
        )} · Last update ${formatDate(submission.lastUpdated)}`}
        viewport={["desktop", "mobile"]}
        titleAccessory={<SubmissionStatusBadge status={liveStatus} />}
      >
        <Button
          variant="outline"
          loading={isDownloading}
          loadingClassName="text-foreground"
          title="Download form submission"
          onClick={handleDownloadSubmissionForm}
        >
          {!isDownloading && <Download className="size-4" />}
          Download PDF
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6">
        <ReviewDecisionCard
          clearErrors={clearErrors}
          control={control}
          draft={draft}
          errors={formState.errors}
          liveStatus={liveStatus}
          setShowMessageComposer={setShowMessageComposer}
          setValue={setValue}
          showMessageComposer={showMessageComposer}
          statusChanged={statusChanged}
          statusOptions={statusOptions}
          willSaveStatus={willSaveStatus}
        />

        <InternalCommentsCard control={control} isArchived={isArchived} />

        <CarDetailsCard
          clearErrors={clearErrors}
          control={control}
          draft={draft}
          editLocale={editLocale}
          errors={formState.errors}
          isArchived={isArchived}
          onImageFilesAdded={(files) => {
            files.forEach(({ file, id }) => {
              pendingFilesRef.current.set(id, file);
            });
          }}
          onImagesChange={(images) => {
            const imageIds = new Set(images.map((image) => image.id));
            pendingFilesRef.current.forEach((_, id) => {
              if (id.startsWith("temp-image-") && !imageIds.has(id)) {
                pendingFilesRef.current.delete(id);
              }
            });
            clearErrors("images");
            setValue("images", images, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          setEditLocale={setEditLocale}
          submission={submission}
        />
      </div>

      <div className="sticky bottom-0 z-20 mt-6 border-t bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-2 py-4">
          <Button variant="outline" onClick={hancleConfirmCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!formState.isDirty}
            onClick={handleSubmit(requestSave, handleInvalid)}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

export function LockedReviewPanel({
  backHref,
  description,
  title,
}: {
  backHref: string;
  description: string;
  title: string;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-start justify-center gap-3 p-5 shadow-none">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={backHref}>Back to submissions</Link>
      </Button>
    </Card>
  );
}

import type {
  CarSubmission,
  SubmissionStatus,
} from "@/src/features/cars/submission/submission.types";
import type { SubmissionReviewFormValues } from "./submission-review.schema";

export function emptyReviewFormValues(): SubmissionReviewFormValues {
  return {
    classId: "",
    status: "pending",
    owner: {
      lastName: "",
      firstName: "",
      email: "",
      mobile: "",
      address: "",
      postcode: "",
    },
    vehicle: {
      make: "",
      model: "",
      bodyStyle: "",
      coachbuilder: "",
      exteriorColour: "",
      chassisNumber: "",
      engineNumber: "",
    },
    year: new Date().getFullYear(),
    history: {
      en: "",
      it: "",
    },
    documents: [],
    documentFiles: [],
    images: [],
    internalComments: "",
    infoRequests: [],
    newInfoMessage: "",
  };
}

export function reviewDraftFromSubmission(
  submission: CarSubmission,
): CarSubmission {
  return {
    ...submission,
    status:
      submission.status === "info_received"
        ? "requested_info"
        : submission.status,
  };
}

export function reviewFormValuesFromSubmission(
  submission: CarSubmission,
): SubmissionReviewFormValues {
  const draft = reviewDraftFromSubmission(submission);

  return {
    classId: draft.classId,
    status: draft.status,
    owner: draft.owner,
    vehicle: draft.vehicle,
    year: draft.year,
    history: draft.history,
    documents: draft.documents,
    documentFiles: [],
    images: draft.images,
    internalComments: draft.internalComments,
    infoRequests: draft.infoRequests,
    newInfoMessage: "",
  };
}

export function submissionFromFormValues(
  submission: CarSubmission,
  values: SubmissionReviewFormValues,
  status: SubmissionStatus,
) {
  const message = values.newInfoMessage.trim();
  const infoRequests =
    values.status === "requested_info" && message
      ? [
          ...values.infoRequests,
          {
            id: `request-${crypto.randomUUID()}`,
            message,
            sentDate: new Date().toISOString().slice(0, 10),
          },
        ]
      : values.infoRequests;

  return {
    ...submission,
    classId: values.classId,
    status,
    owner: values.owner,
    vehicle: values.vehicle,
    year: values.year,
    history: values.history,
    documents: values.documents,
    images: values.images,
    internalComments: values.internalComments,
    infoRequests,
  };
}

"use client";

import Image from "next/image";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Trash2, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useModal } from "@/src/components/providers/modal-provider";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import Text from "@/src/components/ui/text";
import {
  GalleryGroupForm,
  type GalleryGroupFormHandle,
} from "../components/gallery-group-form";
import { GalleryPreview } from "../components/gallery-preview";
import type { GalleryGroup, GalleryImage } from "../gallery-items.types";
import type { Locale } from "@/src/types/locale";

function createCanSaveState() {
  let value = false;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next: boolean) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}

function GroupFormFooter({
  state,
  editing,
  onCancel,
  onDelete,
  onSave,
}: {
  state: ReturnType<typeof createCanSaveState>;
  editing: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("galleryItems");
  const canSave = useSyncExternalStore(
    state.subscribe,
    state.getSnapshot,
    state.getSnapshot,
  );
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div>
        {editing ? (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            leftIcon={Trash2}
            onClick={onDelete}
          >
            {t("delete")}
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button disabled={!canSave} onClick={onSave}>
          {editing ? t("saveChanges") : t("addTab")}
        </Button>
      </div>
    </div>
  );
}

function ConfirmWordField({
  state,
  label,
}: {
  state: ReturnType<typeof createCanSaveState>;
  label: ReactNode;
}) {
  const [value, setValue] = useState("");
  return (
    <Input
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        state.set(next === "delete");
      }}
      autoComplete="off"
      label={label}
      labelClassName="text-muted-foreground"
    />
  );
}

function ConfirmWordFooter({
  state,
  cancelLabel,
  confirmLabel,
  close,
  onCancel,
  onConfirm,
}: {
  state: ReturnType<typeof createCanSaveState>;
  cancelLabel: string;
  confirmLabel: string;
  close: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = useSyncExternalStore(
    state.subscribe,
    state.getSnapshot,
    state.getSnapshot,
  );
  return (
    <>
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant="default"
        disabled={!canConfirm}
        onClick={() => {
          onConfirm();
          close();
        }}
      >
        {confirmLabel}
      </Button>
    </>
  );
}

export function useGalleryItemsModals() {
  const modal = useModal();
  const t = useTranslations("galleryItems");

  const openConfirm = useCallback(
    (options: {
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
      onConfirm: () => void;
    }) => {
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {options.title}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {options.description}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close }) => (
          <>
            <Button variant="outline" onClick={close}>
              {t("keepEditing")}
            </Button>
            <Button
              variant={options.destructive ? "destructive" : "default"}
              onClick={() => {
                options.onConfirm();
                close();
              }}
            >
              {options.confirmLabel}
            </Button>
          </>
        ),
      });
    },
    [modal, t],
  );

  const openGroupForm = useCallback(
    (options: {
      group?: GalleryGroup;
      photoCount?: number;
      initialLanguage?: Locale;
      onSave: (value: { name: string; nameIt: string }) => void;
      onRemove?: () => void;
    }) => {
      const formRef = { current: null } as {
        current: GalleryGroupFormHandle | null;
      };
      const state = createCanSaveState();
      const editing = Boolean(options.group);
      let formValues = {
        name: options.group?.name ?? "",
        nameIt: options.group?.nameIt ?? "",
      };

      function showGroupForm() {
        modal.preventBackdropClose();
        modal.open({
          className: "gap-2 p-0 sm:max-w-lg",
          headerClassName: "border-b-0 px-4 py-0 pt-4",
          header: (
            <div>
              <Text.FormTitle size="xl">
                {t(editing ? "editTab" : "addTab")}
              </Text.FormTitle>
              <Text className="mt-1" size="sm" color="muted-foreground">
                {t(editing ? "editTabDescription" : "addTabDescription")}
              </Text>
            </div>
          ),
          content: (
            <GalleryGroupForm
              ref={(handle) => {
                formRef.current = handle;
              }}
              defaultValues={formValues}
              initialLanguage={options.initialLanguage}
              labels={{
                name: t("tabName"),
                placeholderEn: t("tabPlaceholderEn"),
                placeholderIt: t("tabPlaceholderIt"),
              }}
              onCanSaveChange={state.set}
            />
          ),
          footerClassName: "px-5",
          footer: ({ close }) => (
            <GroupFormFooter
              state={state}
              editing={editing}
              onCancel={close}
              onSave={() => {
                const value = formRef.current?.save();
                if (!value) return;
                options.onSave(value);
                close();
              }}
              onDelete={
                options.onRemove
                  ? () => {
                      const group = options.group;
                      if (!group) return;
                      formValues = formRef.current?.getValues() ?? formValues;
                      const confirmState = createCanSaveState();
                      modal.preventBackdropClose();
                      modal.open({
                        className: "gap-0 p-0 sm:max-w-md",
                        headerClassName: "border-b-0 py-0 px-4 pt-4 pb-4",
                        header: (
                          <div>
                            <Text.FormTitle size="base" weight="medium">
                              {t("removeTabTitle", { name: group.name })}
                            </Text.FormTitle>
                            <Text
                              className="mt-1"
                              size="sm"
                              color="muted-foreground"
                            >
                              {(options.photoCount ?? 0) > 0
                                ? t("removeTabWithPhotosDescription", {
                                    count: options.photoCount ?? 0,
                                  })
                                : t("removeTabDescription")}
                            </Text>
                          </div>
                        ),
                        contentClassName: "px-4 pb-4",
                        content: (
                          <ConfirmWordField
                            state={confirmState}
                            label={t.rich("typeDeleteToConfirm", {
                              strong: (chunks) => (
                                <span className="text-black font-semibold px-1">
                                  {chunks}
                                </span>
                              ),
                            })}
                          />
                        ),
                        footerClassName: "px-5",
                        footer: ({ close: closeConfirmation }) => (
                          <ConfirmWordFooter
                            state={confirmState}
                            cancelLabel={t("cancel")}
                            confirmLabel={t("removeTab")}
                            close={closeConfirmation}
                            onCancel={showGroupForm}
                            onConfirm={() => options.onRemove?.()}
                          />
                        ),
                      });
                    }
                  : undefined
              }
            />
          ),
        });
      }

      showGroupForm();
    },
    [modal, t],
  );

  const openPublish = useCallback(
    (options: {
      incompleteCount: number;
      onFixContent: () => void;
      onPublish: () => Promise<boolean>;
    }) => {
      const missing = options.incompleteCount > 0;
      modal.preventBackdropClose();
      modal.open({
        className: "gap-1.5 p-0 sm:max-w-sm",
        headerClassName: "border-0 px-4 pb-0 pt-4",
        header: (
          <Text.FormTitle size="base" weight="medium">
            {t(missing ? "missingLanguageTitle" : "publishTitle")}
          </Text.FormTitle>
        ),
        contentClassName: "px-4 pb-3",
        content: (
          <Text size="sm" color="muted-foreground">
            {t(missing ? "missingLanguageDescription" : "publishDescription")}
          </Text>
        ),
        footerClassName: "px-4",
        footer: ({ close, loading, run }) => (
          <>
            <Button variant="outline" disabled={loading} onClick={close}>
              {t("keepEditing")}
            </Button>
            {missing ? (
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  close();
                  options.onFixContent();
                }}
              >
                {t("fixContent")}
              </Button>
            ) : null}
            <Button
              loading={loading}
              onClick={() =>
                void run(async () => {
                  if (await options.onPublish()) close();
                })
              }
            >
              {t(missing ? "publishAnyway" : "publishChanges")}
            </Button>
          </>
        ),
      });
    },
    [modal, t],
  );

  const openImage = useCallback(
    (url: string) => {
      modal.handleHideShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        className:
          "w-fit max-w-[90vw] overflow-visible border-0 bg-transparent p-0 shadow-none sm:max-w-[90vw] rounded-3xl",
        content: (
          <div className="relative inline-block">
            <Image
              src={url}
              alt={t("galleryPhoto")}
              width={1920}
              height={1080}
              unoptimized
              className="block h-auto max-h-[90vh] w-auto max-w-[90vw] rounded-2xl object-contain"
            />
            <Button
              className="size-9 absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 z-10 rounded-full bg-white group"
              variant="ghost"
              size="icon-sm"
              onClick={() => modal.close()}
            >
              <XIcon className="text-muted-foreground group-hover:text-black" />
            </Button>
          </div>
        ),
        onOpenChange: (open) => {
          if (!open) modal.reset();
        },
      });
    },
    [modal, t],
  );

  const openPreview = useCallback(
    (groups: GalleryGroup[], images: GalleryImage[]) => {
      modal.handleShowShowCloseButton();
      modal.disableBackdropClose();
      modal.open({
        className:
          "flex h-[90vh] w-[90vw] max-w-7xl overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl sm:max-w-7xl",
        contentClassName: "min-h-0 flex-1 overflow-y-auto",
        content: (
          <GalleryPreview
            groups={groups}
            images={images}
            labels={{
              home: t("previewHome"),
              about: t("previewAbout"),
              enterCar: t("previewEnterCar"),
              becomePartner: t("previewBecomePartner"),
              gallery: t("galleryTitle"),
              ticketsComingSoon: t("previewTickets"),
              menu: t("previewMenu"),
              language: t("previewLanguage"),
              event: t("previewEvent"),
              description: t("previewDescription"),
              enquiries: t("previewEnquiries"),
              email: t("previewEmail"),
              empty: t("previewEmpty"),
            }}
          />
        ),
        onOpenChange: (open) => {
          if (!open) modal.reset();
        },
      });
    },
    [modal, t],
  );

  return { openConfirm, openGroupForm, openPublish, openImage, openPreview };
}

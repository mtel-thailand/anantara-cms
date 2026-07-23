"use client";

import { Button } from "@/src/components/ui/button";
import { normalizedFileName } from "@/src/lib/string";
import { cn } from "@/src/lib/utils";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type FileUploadSectionProps = {
  accept?: string;
  buttonText?: string;
  disabled?: boolean;
  emptyText?: string;
  enabledRemove?: boolean;
  error?: string;
  label?: string;
  multiple?: boolean;
  name?: string;
  onBlur?: () => void;
  onChange?: (files: File[]) => void;
  previewFiles?: Array<{
    fileName?: string;
    id: string;
    key?: string;
    name?: string;
    url: string;
  }>;
  required?: boolean;
  value?: File[];
};

function withObjectUrl(file: File, callback: (url: string) => void) {
  const url = URL.createObjectURL(file);
  callback(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function openFile(file: File, mode: "download" | "view") {
  withObjectUrl(file, (url) => {
    if (mode === "view") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  });
}

function openRemoteFile(
  file: { key?: string; name: string; url: string },
  mode: "download" | "view",
) {
  if (mode === "view") {
    window.open(file.url, "_blank", "noopener,noreferrer");
    return;
  }

  const anchor = window.document.createElement("a");
  anchor.href = file.key
    ? `/api/file?${new URLSearchParams({ key: file.key })}`
    : file.url;
  anchor.download = file.name;
  if (!file.key) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function FileUploadSection({
  accept = ".pdf,.doc,.docx",
  buttonText,
  disabled = false,
  emptyText,
  enabledRemove = true,
  error,
  label,
  multiple = true,
  name,
  onBlur,
  onChange,
  previewFiles = [],
  required = false,
  value,
}: FileUploadSectionProps) {
  const t = useTranslations("common");
  const resolvedButtonText = buttonText ?? t("addDocument");
  const resolvedEmptyText = emptyText ?? t("noDocumentsSelected");
  const resolvedLabel = label ?? t("supportingDocuments");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const files = Array.isArray(value) ? value : internalFiles;
  const remoteFiles = previewFiles.map((file) => ({
    ...file,
    displayName: file.name ?? file.fileName ?? "Document",
  }));
  const displayError = duplicateError ?? error;

  function updateFiles(nextFiles: File[]) {
    if (!Array.isArray(value)) setInternalFiles(nextFiles);
    onChange?.(nextFiles);
  }

  function addFiles(fileList: FileList | null) {
    if (disabled || !fileList?.length) return;

    const selectedFiles = Array.from(fileList);
    const knownNames = new Set(
      [
        ...remoteFiles.map((file) => file.displayName),
        ...files.map((file) => file.name),
      ].map(normalizedFileName),
    );
    const acceptedFiles: File[] = [];
    const duplicateNames: string[] = [];

    for (const file of selectedFiles) {
      const normalizedName = normalizedFileName(file.name);
      if (knownNames.has(normalizedName)) {
        duplicateNames.push(file.name);
        continue;
      }

      knownNames.add(normalizedName);
      acceptedFiles.push(file);
    }

    setDuplicateError(
      duplicateNames.length === 1
        ? `A file named "${duplicateNames[0]}" has already been added.`
        : duplicateNames.length > 1
          ? `${duplicateNames.length} files were skipped because their names already exist.`
          : null,
    );

    if (acceptedFiles.length) {
      updateFiles(multiple ? [...files, ...acceptedFiles] : acceptedFiles);
    }
  }

  return (
    <section
      className="min-w-0 w-full"
      data-review-field="documents"
      tabIndex={-1}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-xs font-medium text-muted-foreground">
          {resolvedLabel}
          {required ? (
            <span className="text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </h3>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" /> {resolvedButtonText}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          hidden
          onBlur={onBlur}
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {remoteFiles.length || files.length ? (
        <ul className="flex min-w-0 flex-col gap-1.5">
          {remoteFiles.map((file) => (
            <li
              key={file.id}
              className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {file.displayName}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`View ${file.displayName}`}
                  title="View"
                  onClick={() =>
                    openRemoteFile(
                      {
                        key: file.key,
                        name: file.displayName,
                        url: file.url,
                      },
                      "view",
                    )
                  }
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Download ${file.displayName}`}
                  title="Download"
                  onClick={() =>
                    openRemoteFile(
                      {
                        key: file.key,
                        name: file.displayName,
                        url: file.url,
                      },
                      "download",
                    )
                  }
                >
                  <Download className="size-4" />
                </Button>
              </div>
            </li>
          ))}
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`View ${file.name}`}
                  title="View"
                  onClick={() => openFile(file, "view")}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Download ${file.name}`}
                  title="Download"
                  onClick={() => openFile(file, "download")}
                >
                  <Download className="size-4" />
                </Button>
                {!disabled && enabledRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${file.name}`}
                    title="Remove"
                    onClick={() =>
                      updateFiles(
                        files.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p
          aria-invalid={Boolean(displayError) || undefined}
          className={cn(
            "min-w-0 break-words rounded-md border border-dashed px-3 py-2 text-xs",
            displayError
              ? "border-destructive text-destructive ring-3 ring-destructive/20"
              : "text-muted-foreground",
          )}
        >
          {resolvedEmptyText}
        </p>
      )}

      {displayError ? (
        <p
          aria-invalid="true"
          className="mt-1.5 min-w-0 break-words text-sm text-destructive"
        >
          {displayError}
        </p>
      ) : null}
    </section>
  );
}

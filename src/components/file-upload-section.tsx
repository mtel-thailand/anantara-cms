"use client";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

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
  file: { name: string; url: string },
  mode: "download" | "view",
) {
  if (mode === "view") {
    window.open(file.url, "_blank", "noopener,noreferrer");
    return;
  }

  const anchor = window.document.createElement("a");
  anchor.href = file.url;
  anchor.download = file.name;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function normalizedFileName(name: string) {
  return name.normalize("NFKC").trim().toLowerCase();
}

export default function FileUploadSection({
  accept = ".pdf,.doc,.docx",
  buttonText = "Add document",
  disabled = false,
  emptyText = "No documents selected.",
  enabledRemove = true,
  error,
  label = "Supporting documents",
  multiple = true,
  name,
  onBlur,
  onChange,
  previewFiles = [],
  required = false,
  value,
}: FileUploadSectionProps) {
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
    <section data-review-field="documents" tabIndex={-1}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          {label}
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
          <Upload className="size-4" /> {buttonText}
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
        <ul className="flex flex-col gap-1.5">
          {remoteFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {file.displayName}
              </span>
              <div className="ml-auto flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`View ${file.displayName}`}
                  title="View"
                  onClick={() =>
                    openRemoteFile(
                      { name: file.displayName, url: file.url },
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
                      { name: file.displayName, url: file.url },
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
              className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <div className="ml-auto flex items-center gap-0.5">
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
            "rounded-md border border-dashed px-3 py-2 text-xs",
            displayError
              ? "border-destructive text-destructive ring-3 ring-destructive/20"
              : "text-muted-foreground",
          )}
        >
          {emptyText}
        </p>
      )}

      {displayError ? (
        <p aria-invalid="true" className="mt-1.5 text-sm text-destructive">
          {displayError}
        </p>
      ) : null}
    </section>
  );
}

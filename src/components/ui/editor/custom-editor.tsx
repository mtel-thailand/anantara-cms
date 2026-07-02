// components/custom-editor.js
"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  FileLoader,
  Editor,
  ImageUpload,
  FileRepository,
  Image,
  Style,
} from "ckeditor5";
import { memo, useRef } from "react";
import "ckeditor5/ckeditor5.css";
import {
  CkEditorUploadAdapter,
  deleteEditorUploadedFile,
  getS3KeyFromImageUrl,
} from "./uploadAdaptor";
import { logger } from "@/src/lib/logger";

function getImageKeysFromHtml(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(document.querySelectorAll("img"));

  return new Set(
    images
      .map((image) => image.getAttribute("src"))
      .filter((src): src is string => Boolean(src))
      .map(getS3KeyFromImageUrl),
  );
}

interface CustomEditorProps extends Omit<
  React.ComponentProps<typeof CKEditor>,
  "onChange" | "editor"
> {
  onChange?: (data: string) => void;
}

const CustomEditor = memo((props: CustomEditorProps) => {
  const { data, onChange, onBlur, ...restProps } = props;

  const imageKeysRef = useRef<Set<string>>(new Set());

  function uploadPlugin(editor: Editor) {
    editor.plugins.get("FileRepository").createUploadAdapter = (
      loader: FileLoader,
    ) => {
      return new CkEditorUploadAdapter(loader);
    };
  }
  console.log("data editor", data);
  return (
    <CKEditor
      data={data}
      editor={ClassicEditor}
      onReady={(editor) => {
        imageKeysRef.current = getImageKeysFromHtml(editor.getData());
      }}
      onChange={(_, editor) => {
        if (onChange) {
          const data = editor.getData();
          onChange && onChange(data);
        }

        // Remove image from editor by S3 APIs
        const nextImageKeys = getImageKeysFromHtml(editor.getData());
        const removedImageKeys = Array.from(imageKeysRef.current).filter(
          (key) => !nextImageKeys.has(key),
        );

        imageKeysRef.current = nextImageKeys;

        removedImageKeys.forEach((key) => {
          void deleteEditorUploadedFile(key, "editor-image-removed").catch(
            (error) => {
              logger.error("EDITOR_UPLOAD", "failed to remove deleted image", {
                key,
                error: error instanceof Error ? error.message : String(error),
              });
            },
          );
        });
      }}
      config={{
        licenseKey: "GPL",
        plugins: [
          Essentials,
          Paragraph,
          Bold,
          Italic,
          Image,
          ImageUpload,
          FileRepository,
          Style,
        ],
        extraPlugins: [uploadPlugin],
        toolbar: [
          "undo",
          "redo",
          "|",
          "bold",
          "italic",
          "|",
          "imageUpload",
          "|",
          "style",
        ],
        // initialData: "<p>Hello from CKEditor 5 in Next.js!</p>",
        style: {
          definitions: [
            {
              name: "Contact Card",
              element: "p",
              classes: ["contact-card"],
            },
          ],
        },
      }}
    />
  );
});

CustomEditor.displayName = "CustomEditor";

export default CustomEditor;

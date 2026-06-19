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

import "ckeditor5/ckeditor5.css";
import { CkEditorUploadAdapter } from "./uploadAdaptor";

export default function CustomEditor() {
  function uploadPlugin(editor: Editor) {
    editor.plugins.get("FileRepository").createUploadAdapter = (
      loader: FileLoader,
    ) => {
      return new CkEditorUploadAdapter(loader);
    };
  }

  return (
    <CKEditor
      editor={ClassicEditor}
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
        initialData: "<p>Hello from CKEditor 5 in Next.js!</p>",
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
}

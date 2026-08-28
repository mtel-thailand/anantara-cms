// components/custom-editor.js
"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  BlockQuote,
  Alignment,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  HorizontalLine,
  Indent,
  IndentBlock,
  Italic,
  Heading,
  FileLoader,
  Editor,
  ImageUpload,
  Image,
  Link,
  List,
  MediaEmbed,
  RemoveFormat,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
  AutoLink,
  LinkImage,
  ListProperties,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageInsert,
  PictureEditing,
  Base64UploadAdapter,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { memo, useRef, type ComponentProps } from "react";
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
  ComponentProps<typeof CKEditor>,
  "onChange" | "editor"
> {
  onChange?: (data: string) => void;
  placeholder?: string;
}

const BRAND_COLORS = [
  { color: "#C71A4E", label: "Crimson" },
  { color: "#8E001C", label: "Dark red" },
  { color: "#1E1E1E", label: "Near black" },
  { color: "#525252", label: "Dark grey" },
  { color: "#787878", label: "Grey" },
  { color: "#B3A258", label: "Gold" },
  { color: "#716835", label: "Olive" },
];

const CustomEditor = memo((props: CustomEditorProps) => {
  const { data, onChange, onBlur, placeholder, ...restProps } = props;

  const imageKeysRef = useRef<Set<string>>(new Set());

  function uploadPlugin(editor: Editor) {
    editor.plugins.get("FileRepository").createUploadAdapter = (
      loader: FileLoader,
    ) => {
      return new CkEditorUploadAdapter(loader);
    };
  }
  return (
    <div className="cke-field">
      <CKEditor
        data={data}
        editor={ClassicEditor}
        onReady={(editor) => {
          imageKeysRef.current = getImageKeysFromHtml(editor.getData());
        }}
        onBlur={onBlur}
        onChange={(_, editor) => {
          if (onChange) {
            const data = editor.getData();
            onChange(data);
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
                logger.error(
                  "EDITOR_UPLOAD",
                  "failed to remove deleted image",
                  {
                    key,
                    error:
                      error instanceof Error ? error.message : String(error),
                  },
                );
              },
            );
          });
        }}
        config={{
          licenseKey: "GPL",
          placeholder,
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            RemoveFormat,
            FontFamily,
            FontSize,
            FontColor,
            FontBackgroundColor,
            Alignment,
            Link,
            AutoLink,
            LinkImage,
            List,
            ListProperties,
            Indent,
            IndentBlock,
            BlockQuote,
            HorizontalLine,
            Image,
            ImageToolbar,
            ImageCaption,
            ImageStyle,
            ImageResize,
            ImageInsert,
            ImageUpload,
            PictureEditing,
            Base64UploadAdapter,
            MediaEmbed,
            Table,
            TableToolbar,
            Undo,
          ],
          extraPlugins: [uploadPlugin],
          toolbar: {
            items: [
              "undo",
              "redo",
              "|",
              "heading",
              "|",
              "fontFamily",
              "fontSize",
              "fontColor",
              "fontBackgroundColor",
              "|",
              "bold",
              "italic",
              "underline",
              "strikethrough",
              "removeFormat",
              "|",
              "alignment",
              "|",
              "link",
              "insertImage",
              "blockQuote",
              "insertTable",
              "mediaEmbed",
              "horizontalLine",
              "|",
              "bulletedList",
              "numberedList",
              "outdent",
              "indent",
            ],
            shouldNotGroupWhenFull: true,
          },
          heading: {
            options: [
              {
                model: "paragraph",
                title: "Paragraph",
                class: "ck-heading_paragraph",
              },
              {
                model: "heading1",
                view: "h1",
                title: "Heading 1",
                class: "ck-heading_heading1",
              },
              {
                model: "heading2",
                view: "h2",
                title: "Heading 2",
                class: "ck-heading_heading2",
              },
              {
                model: "heading3",
                view: "h3",
                title: "Heading 3",
                class: "ck-heading_heading3",
              },
            ],
          },
          fontFamily: {
            // The site's two display faces sit first, then common fallbacks.
            options: [
              "Playfair Display, Georgia, serif",
              "EB Garamond, Georgia, serif",
              "default",
              "Arial, Helvetica, sans-serif",
              "Georgia, serif",
              "Times New Roman, Times, serif",
            ],
            supportAllValues: true,
          },
          fontSize: {
            options: [10, 12, 14, "default", 18, 20, 24, 30, 36, 48, 60],
            supportAllValues: true,
          },
          fontColor: {
            colors: BRAND_COLORS,
            colorPicker: { format: "hex" },
          },
          fontBackgroundColor: {
            colors: BRAND_COLORS,
            colorPicker: { format: "hex" },
          },
          link: {
            defaultProtocol: "https://",
            addTargetToExternalLinks: true,
          },
          image: {
            toolbar: [
              "imageStyle:inline",
              "imageStyle:block",
              "imageStyle:side",
              "|",
              "toggleImageCaption",
              "imageTextAlternative",
              "|",
              "linkImage",
            ],
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
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
        {...restProps}
      />
    </div>
  );
});

CustomEditor.displayName = "CustomEditor";

export default CustomEditor;

"use client";

import dynamic from "next/dynamic";

const ClientSideCustomEditor = dynamic(
  () => import("@/src/components/ui/editor/custom-editor"),
  { ssr: false },
);

export default ClientSideCustomEditor;

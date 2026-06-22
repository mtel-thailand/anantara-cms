"use client";
import { ColumnDef } from "@tanstack/react-table";
import ClientSideDraggableTable from "../components/ui/table/client-side-custom-table";
import { useEffect, useState } from "react";
import ClientSideCustomEditor from "../components/ui/editor/client-side-custom-editor";
import { logger } from "../lib/logger";
import { eventEmitter } from "../lib/events";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
];

const initialData: User[] = [
  { id: "1", name: "John", email: "john@test.com", role: "Admin" },
  { id: "2", name: "Jane", email: "jane@test.com", role: "User" },
  { id: "3", name: "Bob", email: "bob@test.com", role: "Editor" },
];

export default function TestParent() {
  const [count, setCount] = useState(1);
  const [data, setData] = useState(initialData);
  const [dataEditor, setDataEditor] = useState("");
  console.log("Parent");

  useEffect(() => {
    // Define the callback function
    const handleAlert = (url: string) => {
      logger.info("EVENT", "image uploaded event received", { url });
    };

    eventEmitter.on("image-uploaded", handleAlert);

    return () => {
      eventEmitter.off("image-uploaded", handleAlert);
    };
  }, []);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>eiei</button>
      <ClientSideDraggableTable
        data={data}
        columns={columns}
        onReorder={setData}
      />
      <ClientSideCustomEditor
        id="editor-ckeditor"
        data={dataEditor}
        onChange={setDataEditor}
      />
    </>
  );
}

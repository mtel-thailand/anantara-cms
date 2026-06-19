"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DraggableTable } from "./ui/table";

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

export default function TestTable() {
  const [data, setData] = useState(initialData);
  console.log("data", data);
  return <DraggableTable data={data} columns={columns} onReorder={setData} />;
}

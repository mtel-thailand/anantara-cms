import { DeployButton } from "@/src/components/deploy-button";
import { EnvVarWarning } from "@/src/components/env-var-warning";
import { AuthButton } from "@/src/components/auth-button";
import { Hero } from "@/src/components/hero";
import { ConnectSupabaseSteps } from "@/src/components/tutorial/connect-supabase-steps";
import { SignUpUserSteps } from "@/src/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/src/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import LocaleSwitcher from "@/src/components/locale-switcher";
import { useTranslations } from "next-intl";
import ClientSideCustomEditor from "@/src/components/ui/editor/client-side-custom-editor";

import { ColumnDef } from "@tanstack/react-table";
import TestParent from "@/src/features/test-parent";

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
export default function Home() {
  const t = useTranslations();
  console.log("Home trigger");
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
                {t("main.main")}
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
            <LocaleSwitcher />
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <Hero />
          <main className="flex-1 flex flex-col gap-6 px-4">
            <h2 className="font-medium text-xl mb-4">Next steps</h2>
            {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
          </main>
        </div>
        <TestParent />

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

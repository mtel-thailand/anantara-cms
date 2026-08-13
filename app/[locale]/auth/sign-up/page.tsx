// import { SignUpForm } from "@/src/components/sign-up-form";
import { redirect } from "@/src/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function Page() {
  const locale = await getLocale();

  redirect({ href: "/auth/login", locale });

  return (
    <></>
    // <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    //   <div className="w-full max-w-sm">
    //     <SignUpForm />
    //   </div>
    // </div>
  );
}

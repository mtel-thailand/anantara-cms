"use client";

import { cn } from "@/src/lib/utils";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import Link from "next/link";
import { useState, type ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Text from "@/src/components/ui/text";
import LogoBlack from "@/public/images/logo-black.png";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import ControlledInput from "@/src/components/form/input";
import useAsync from "@/src/hooks/use-async";
import { ArrowLeft, Mail } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "./forgot-password.schema";

const defaultValues: ForgotPasswordFormValues = {
  email: "",
};

export function ForgotPasswordClient({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { control, handleSubmit, formState } =
    useForm<ForgotPasswordFormValues>({
    defaultValues,
    resolver: zodResolver(forgotPasswordSchema),
    shouldUnregister: true,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { isLoading, execute } = useAsync(false);

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    return await execute<[string], void>(async (email) => {
      const supabase = createClient();
      setError(null);
      try {
        // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setSuccess(true);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    }, data.email);
  };

  return (
    <div
      className={cn(
        "w-screen h-screen flex flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <Image
        src={LogoBlack}
        width={150}
        height={150}
        alt="anantara-logo-black"
      />
      <div className="flex flex-col gap-2 mt-2">
        <Text.FormTitle className="text-center">Forgot Password</Text.FormTitle>
        <Text className="text-center" size="sm" color="muted-foreground">
          Enter your email address and we&apos;ll send you a reset link.
        </Text>
      </div>
      <div className="w-full max-w-md mt-8">
        <Card className="w-full">
          <CardContent>
            {success ? (
              <>
                <div className="flex flex-col gap-5">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                    If this email is registered, a password reset link will be
                    sent shortly.
                  </div>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/auth/login">Back to sign in</Link>
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <ControlledInput<ForgotPasswordFormValues>
                      id="email"
                      name="email"
                      label="Email"
                      htmlFor="email"
                      control={control}
                      placeholder="you@anantara.com"
                      aria-invalid={Boolean(formState.errors.email)}
                      error={{
                        hasError: Boolean(formState.errors.email),
                        message: formState.errors.email?.message,
                      }}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    leftIcon={Mail}
                  >
                    {isLoading ? "Sending..." : "Send reset email"}
                  </Button>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={isLoading}
                    leftIcon={ArrowLeft}
                    variant="ghost"
                  >
                    <Link href="/auth/login">Back to sign in</Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

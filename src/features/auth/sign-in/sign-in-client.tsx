"use client";

import { cn } from "@/src/lib/utils";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentPropsWithoutRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ControlledInput from "@/src/components/form/input";
import Image from "next/image";
import LogoBlack from "@/public/images/logo-black.png";
import Text from "@/src/components/ui/text";
import { Eye, EyeOff } from "lucide-react";
import useAsync from "@/src/hooks/use-async";
import {
  signInSchema,
  type SignInFormValues,
} from "./sign-in.schema";

const defaultValues: SignInFormValues = {
  email: "",
  password: "",
};

export function SignInClient({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  const { control, handleSubmit, formState } = useForm<SignInFormValues>({
    defaultValues,
    resolver: zodResolver(signInSchema),
    shouldUnregister: true,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { isLoading, execute } = useAsync(false);

  const onSubmit = async (data: SignInFormValues) => {
    return await execute<[string, string], void>(
      async (email, password) => {
        const supabase = createClient();
        setError(null);

        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;

          // Update this route to redirect to an authenticated route. The user already has an active session.
          router.push("/app/agenda");
        } catch (error: unknown) {
          setError(
            error instanceof Error ? error.message : "An error occurred",
          );
        }
      },
      data.email,
      data.password,
    );
  };

  return (
    <div
      className={cn(
        "w-full h-screen flex flex-col items-center justify-center",
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
      <div className="w-full flex flex-col gap-2 mt-2">
        <Text.FormTitle className="text-center">CMS Login</Text.FormTitle>
        <Text
          className="text-center w-full whitespace-nowrap"
          size="sm"
          color="muted-foreground"
        >
          Sign in to manage the Anantara Concorso Roma website and app.
        </Text>
      </div>
      <Card className="w-full max-w-md mt-8">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <ControlledInput<SignInFormValues>
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
              <div className="relative">
                <div className="absolute -top-1.5 right-0">
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-xs underline-offset-4 hover:underline text-primary active:translate-y-0.5 transition-transform duration-200"
                  >
                    Forgot password?
                  </Link>
                </div>
                <ControlledInput<SignInFormValues>
                  id="password"
                  name="password"
                  label="Password"
                  htmlFor="password"
                  autoComplete="current-password"
                  control={control}
                  placeholder="••••••••••"
                  type={showPassword ? "text" : "password"}
                  aria-invalid={Boolean(formState.errors.password)}
                  error={{
                    hasError: Boolean(formState.errors.password),
                    message: formState.errors.password?.message,
                  }}
                  rightButton={{
                    label: showPassword ? "Hide password" : "Show password",
                    onClick: () => setShowPassword((visible) => !visible),
                    icon: showPassword ? EyeOff : Eye,
                  }}
                />
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Text size="xs" color="muted-foreground" className="mt-8">
        Anantara Concorso Roma · Internal use only
      </Text>
    </div>
  );
}

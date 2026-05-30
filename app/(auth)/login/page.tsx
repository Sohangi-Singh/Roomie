"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, mapAuthError } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { COLLEGE_EMAIL_DOMAINS } from "@/config/college";
import { useAuthStatus } from "@/hooks/useAuth";
import { Button, Input, Field } from "@/components/ui";
import { ConfigNotice } from "@/components/features/ConfigNotice";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const status = useAuthStatus();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authed") router.replace("/matches");
  }, [status, router]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values.email, values.password);
      router.replace("/matches");
    } catch (e) {
      setServerError(mapAuthError(e));
    }
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Log in to see your matches.</p>
      {!isFirebaseConfigured && <ConfigNotice />}
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="College email" error={errors.email?.message}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={`you@${COLLEGE_EMAIL_DOMAINS[0]}`}
            {...register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
        </Field>
        {serverError && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {serverError}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}

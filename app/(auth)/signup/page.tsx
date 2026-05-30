"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp, mapAuthError } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  COLLEGE_EMAIL_DOMAINS,
  COLLEGE_NAME,
  isCollegeEmail,
} from "@/config/college";
import { useAuthStatus } from "@/hooks/useAuth";
import { Button, Input, Field } from "@/components/ui";
import { ConfigNotice } from "@/components/features/ConfigNotice";

const schema = z.object({
  fullName: z.string().min(2, "Tell us your name"),
  email: z
    .string()
    .email("Enter a valid email")
    .refine(isCollegeEmail, `Use your ${COLLEGE_NAME} email`),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const status = useAuthStatus();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authed") router.replace("/onboarding");
  }, [status, router]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signUp(values.email, values.password, values.fullName);
      router.replace("/onboarding");
    } catch (e) {
      setServerError(mapAuthError(e));
    }
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Create your profile</h1>
      <p className="mt-2 text-sm text-muted">
        Use your {COLLEGE_NAME} email — we keep matches within your college.
      </p>
      {!isFirebaseConfigured && <ConfigNotice />}
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="Full name" error={errors.fullName?.message}>
          <Input
            autoComplete="name"
            placeholder="Your name"
            {...register("fullName")}
          />
        </Field>
        <Field label="College email" error={errors.email?.message}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={`you@${COLLEGE_EMAIL_DOMAINS[0]}`}
            {...register("email")}
          />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 6 characters."
        >
          <Input
            type="password"
            autoComplete="new-password"
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
          Continue
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-700">
          Log in
        </Link>
      </p>
    </div>
  );
}

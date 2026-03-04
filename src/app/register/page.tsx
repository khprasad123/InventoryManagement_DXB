"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/app/auth/register/actions";

const registerSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<Record<string, string[]>>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterForm) {
    setServerError({});
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("companyName", data.companyName);
    formData.set("email", data.email);
    formData.set("password", data.password);

    const result = await registerUser(formData);
    if (result?.error) {
      setServerError(result.error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-16 w-16 items-center justify-center">
            <Logo variant="icon" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-2xl font-semibold">KaHa Enterprise Cloud</h1>
          <p className="text-sm text-muted-foreground">Create your company and admin account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm">
              Your name
            </label>
            <Input
              id="name"
              placeholder="Enter your name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            {serverError.name && (
              <p className="text-sm text-destructive">{serverError.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="companyName" className="block text-sm">
              Company name
            </label>
            <Input
              id="companyName"
              placeholder="Your company or organization"
              {...register("companyName")}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
            {serverError.companyName && (
              <p className="text-sm text-destructive">{serverError.companyName[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            {serverError.email && (
              <p className="text-sm text-destructive">{serverError.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            {serverError.password && (
              <p className="text-sm text-destructive">{serverError.password[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

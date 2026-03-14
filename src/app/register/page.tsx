"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/app/auth/register/actions";

const registerSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Company address is required"),
  phone: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().optional(),
  taxRegistrationNo: z.string().optional(),
  bankDetails: z.string().optional(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<Record<string, string[]>>({});
  const logoRef = useRef<HTMLInputElement>(null);
  const sealRef = useRef<HTMLInputElement>(null);

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
    formData.set("address", data.address);
    if (data.phone) formData.set("phone", data.phone);
    if (data.fax) formData.set("fax", data.fax);
    if (data.website) formData.set("website", data.website);
    if (data.taxRegistrationNo) formData.set("taxRegistrationNo", data.taxRegistrationNo);
    if (data.bankDetails) formData.set("bankDetails", data.bankDetails);
    formData.set("email", data.email);
    formData.set("password", data.password);

    const logoFile = logoRef.current?.files?.[0];
    const sealFile = sealRef.current?.files?.[0];
    if (logoFile) formData.set("logo", logoFile);
    if (sealFile) formData.set("seal", sealFile);

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

        <form onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
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
            <Label htmlFor="companyName">Company name</Label>
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
            <label htmlFor="address" className="block text-sm">
              Company address *
            </label>
            <Input
              id="address"
              placeholder="PO Box, city, country"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
            {serverError.address && (
              <p className="text-sm text-destructive">{serverError.address[0]}</p>
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
            <Label htmlFor="password">Password</Label>
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

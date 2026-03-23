"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getOrganizationId } from "@/lib/auth-utils";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password"),
});

export async function changeOwnPassword(formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.newPassword?.[0]
      ?? parsed.error.flatten().fieldErrors.currentPassword?.[0]
      ?? "Invalid input.";
    return { error: msg };
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: (user as { id?: string }).id, deletedAt: null },
  });
  if (!dbUser) {
    return { error: "User not found." };
  }

  const isValid = await compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!isValid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { passwordHash },
  });

  revalidatePath("/settings/profile");
  return {};
}

export async function uploadOwnSignature(
  formData: FormData
): Promise<{ error?: string; url?: string }> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "File is required." };
  if (file.size > MAX_SIZE) return { error: "File must be under 2MB." };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Allowed: PNG, JPEG, WebP." };

  const { put } = await import("@vercel/blob");
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "png";
  const key = `org-${orgId}/user-signatures/${Date.now()}.${ext}`;
  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const userId = (sessionUser as { id?: string }).id;
  if (!userId) return { error: "Invalid user session." };

  await prisma.user.update({
    where: { id: userId },
    data: { signatureUrl: blob.url },
  });

  revalidatePath("/settings/profile");
  return { url: blob.url };
}

export async function removeOwnSignature(): Promise<{ error?: string }> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const userId = (sessionUser as { id?: string }).id;
  if (!userId) return { error: "Invalid user session." };

  await prisma.user.update({
    where: { id: userId },
    data: { signatureUrl: null },
  });

  revalidatePath("/settings/profile");
  return {};
}

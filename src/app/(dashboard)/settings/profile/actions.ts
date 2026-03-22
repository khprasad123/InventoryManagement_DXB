"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

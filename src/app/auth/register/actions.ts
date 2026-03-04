"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return { error: { email: ["Email already registered"] } };
  }

  const defaultOrg = await prisma.organization.findFirst({
    where: { slug: "default", deletedAt: null },
  });

  if (!defaultOrg) {
    return { error: { email: ["System not configured. Contact support."] } };
  }

  const adminRole = await prisma.role.findFirst({
    where: {
      organizationId: defaultOrg.id,
      name: "ADMIN",
      deletedAt: null,
    },
  });

  if (!adminRole) {
    return { error: { email: ["System not configured. Contact support."] } };
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: defaultOrg.id,
      roleId: adminRole.id,
    },
  });

  redirect("/login?registered=1");
}

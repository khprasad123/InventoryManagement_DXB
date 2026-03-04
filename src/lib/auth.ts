import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            deletedAt: null,
          },
          include: {
            organizations: {
              where: { organization: { deletedAt: null } },
              include: {
                organization: true,
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        const userOrgs = user.organizations;
        if (!userOrgs.length) {
          throw new Error("No organization assigned");
        }

        const firstOrg = userOrgs[0];
        const permissionCodes = firstOrg.role.permissions.map((rp) => rp.permission.code);

        const organizations = userOrgs.map((uo) => ({
          id: uo.organizationId,
          name: uo.organization.name,
          slug: uo.organization.slug,
          role: uo.role.name,
          permissions: uo.role.permissions.map((rp) => rp.permission.code),
          isSuperAdmin: uo.isSuperAdmin,
        }));

        await prisma.auditLog.create({
          data: {
            organizationId: firstOrg.organizationId,
            userId: user.id,
            action: "LOGIN",
            entityType: null,
            entityId: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: firstOrg.role.name,
          organizationId: firstOrg.organizationId,
          organizationName: firstOrg.organization.name,
          permissions: permissionCodes,
          isSuperAdmin: firstOrg.isSuperAdmin,
          organizations,
        };
      },
    }),
  ],
  events: {
    async signOut({ token }) {
      const orgId = token?.organizationId as string | undefined;
      const userId = token?.id as string | undefined;
      if (orgId && userId) {
        try {
          await prisma.auditLog.create({
            data: {
              organizationId: orgId,
              userId,
              action: "LOGOUT",
              entityType: null,
              entityId: null,
            },
          });
        } catch {
          // ignore
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.organizations = (user as { organizations?: { id: string; name: string; slug: string; role: string; permissions: string[]; isSuperAdmin: boolean }[] }).organizations ?? [];
      }
      if (trigger === "update" && session?.organizationId) {
        const orgs = (token.organizations ?? []) as { id: string; name: string; slug: string; role: string; permissions: string[]; isSuperAdmin: boolean }[];
        const org = orgs.find((o) => o.id === session.organizationId);
        if (org) {
          token.organizationId = org.id;
          token.organizationName = org.name;
          token.role = org.role;
          token.permissions = org.permissions;
          token.isSuperAdmin = org.isSuperAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
        session.user.organizations = (token.organizations as { id: string; name: string; slug: string }[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

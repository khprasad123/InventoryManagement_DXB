import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const INACTIVITY_MINUTES = 15;
const SESSION_MAX_AGE = INACTIVITY_MINUTES * 60; // 15 min in seconds
const SESSION_UPDATE_AGE = 60; // Refresh session every 60s when active (sliding window)

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
          logoUrl: uo.organization.logoUrl,
          role: uo.role.name,
          permissions: uo.role.permissions.map((rp) => rp.permission.code),
          isSuperAdmin: uo.isSuperAdmin,
        }));

        // Single-session: generate new token, invalidates any other logged-in session
        const sessionToken = randomBytes(32).toString("hex");
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionToken },
        });

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
          sessionToken,
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
        token.sessionToken = (user as { sessionToken?: string }).sessionToken;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.organizations = (user as { organizations?: { id: string; name: string; slug: string; logoUrl?: string | null; role: string; permissions: string[]; isSuperAdmin: boolean }[] }).organizations ?? [];
      } else if (token?.id) {
        // Verify single-session: token must match current user sessionToken
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionToken: true },
        });
        if (!dbUser || dbUser.sessionToken !== (token.sessionToken as string)) {
          return {};
        }
      }
      if (trigger === "update" && session?.organizationId) {
        const orgs = (token.organizations ?? []) as { id: string; name: string; slug: string; logoUrl?: string | null; role: string; permissions: string[]; isSuperAdmin: boolean }[];
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
      if (!token?.id) return { ...session, expires: "1970-01-01" }; // Invalid/revoked token; session will be treated as expired
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean) ?? false;
        session.user.organizations = (token.organizations as { id: string; name: string; slug: string; logoUrl?: string | null }[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

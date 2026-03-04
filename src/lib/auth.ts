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
              take: 1,
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

        const userOrg = user.organizations[0];
        if (!userOrg) {
          throw new Error("No organization assigned");
        }

        const permissionCodes = userOrg.role.permissions.map((rp) => rp.permission.code);

        await prisma.auditLog.create({
          data: {
            organizationId: userOrg.organizationId,
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
          role: userOrg.role.name,
          organizationId: userOrg.organizationId,
          organizationName: userOrg.organization.name,
          permissions: permissionCodes,
          isSuperAdmin: userOrg.isSuperAdmin,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
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

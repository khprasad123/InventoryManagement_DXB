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
                role: true,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
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

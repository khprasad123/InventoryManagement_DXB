import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    organizationId: string;
    organizationName: string;
    permissions?: string[];
    isSuperAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      organizationId: string;
      organizationName: string;
      permissions: string[];
      isSuperAdmin: boolean;
      organizations?: { id: string; name: string; slug: string }[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId: string;
    organizationName: string;
    permissions: string[];
    isSuperAdmin: boolean;
    organizations?: { id: string; name: string; slug: string; role: string; permissions: string[]; isSuperAdmin: boolean }[];
  }
}

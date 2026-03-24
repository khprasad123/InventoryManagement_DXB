"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Users,
  UserCircle,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  FileText,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoDark from "@/lib/logo/kaha-logo-dark.png";
import { useState } from "react";
import { canUser, PERMISSIONS } from "@/lib/permissions";

type SidebarUser = {
  role?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  organizationId?: string;
  organizations?: { id: string; logoUrl?: string | null }[];
};

type NavItem = {
  href: string;
  label: string;
  icon: any;
  visible: (user: SidebarUser | undefined) => boolean;
};

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user as SidebarUser | undefined;
  const orgId = user?.organizationId;
  const orgs = user?.organizations ?? [];
  const currentOrg = orgs.find((o) => o.id === orgId);
  const logoUrl = currentOrg?.logoUrl;
  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visible: () => true },
    { href: "/inventory", label: "Inventory", icon: Package, visible: (u) => canUser(u ?? null, PERMISSIONS.INVENTORY_READ) },
    { href: "/suppliers", label: "Suppliers", icon: Users, visible: (u) => canUser(u ?? null, PERMISSIONS.SUPPLIERS_READ) },
    { href: "/clients", label: "Clients", icon: UserCircle, visible: (u) => canUser(u ?? null, PERMISSIONS.CLIENTS_READ) },
    { href: "/purchases", label: "Purchases", icon: ShoppingCart, visible: (u) => canUser(u ?? null, PERMISSIONS.PURCHASES_READ) },
    { href: "/sales", label: "Sales", icon: TrendingUp, visible: (u) => canUser(u ?? null, PERMISSIONS.SALES_READ) },
    { href: "/expenses", label: "Expenses", icon: CreditCard, visible: (u) => canUser(u ?? null, PERMISSIONS.EXPENSES_READ) },
    { href: "/reports", label: "Reports", icon: FileText, visible: (u) => canUser(u ?? null, PERMISSIONS.VIEW_REPORTS) },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      visible: (u) =>
        Boolean(
          u?.isSuperAdmin ||
            canUser(u ?? null, PERMISSIONS.SETTINGS_USERS_MANAGE) ||
            canUser(u ?? null, PERMISSIONS.SETTINGS_ROLES_MANAGE) ||
            canUser(u ?? null, PERMISSIONS.VIEW_AUDIT)
        ),
    },
  ];
  const visibleNavItems = navItems.filter((item) => item.visible(user));

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 min-h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Link href="/dashboard" className="flex shrink-0 items-center">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Organization logo"
                  width={220}
                  height={56}
                  className="h-12 w-auto max-w-[220px] object-contain object-left"
                  unoptimized
                />
              ) : (
                <Image
                  src={logoDark}
                  alt="KaHa Enterprise Cloud"
                  width={220}
                  height={56}
                  className="h-12 w-auto max-w-[220px] object-contain object-left"
                  priority
                />
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}

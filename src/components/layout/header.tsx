"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import type { Session } from "next-auth";

const pathToTitle: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/suppliers": "Suppliers",
  "/clients": "Clients",
  "/purchases": "Purchases",
  "/purchases/grn": "Goods Received Notes",
  "/purchases/grn/add": "Create GRN",
  "/purchases/add": "Create Purchase Invoice",
  "/sales": "Sales",
  "/sales/quotations": "Quotations",
  "/sales/quotations/add": "Create Quotation",
  "/sales/add": "Create Sales Invoice",
  "/expenses": "Expenses",
  "/expenses/categories": "Expense Categories",
  "/expenses/categories/add": "Add Category",
  "/expenses/add": "Add Expense",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  if (pathToTitle[pathname]) return pathToTitle[pathname];
  if (pathname.startsWith("/purchases/grn/")) return "GRN";
  if (pathname.startsWith("/purchases/")) return "Purchase";
  if (pathname.startsWith("/sales/quotations/")) return "Quotation";
  if (pathname.startsWith("/sales/")) return "Sales";
  if (pathname.startsWith("/expenses/categories/")) return "Expense Category";
  if (pathname.startsWith("/expenses/")) return "Expenses";
  return pathToTitle[pathname] ?? "Dashboard";
}


interface HeaderProps {
  session: Session | null;
}

export function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? session?.user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-2xl font-medium">{title}</h1>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="relative h-10 w-10 p-0"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {initials}
              </div>
              <span>{session?.user?.name ?? "Admin"}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col px-2 py-2">
              <p className="text-sm font-medium">{session?.user?.name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

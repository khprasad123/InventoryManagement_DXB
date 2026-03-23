import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { InactivityLogout } from "../inactivity-logout";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <InactivityLogout />
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="lg:pl-64 print:pl-0">
        <div className="print:hidden">
          <Header session={session} />
        </div>
        <main className="p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}

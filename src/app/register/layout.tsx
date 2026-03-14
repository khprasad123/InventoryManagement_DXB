import { redirect } from "next/navigation";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.IS_OWNER !== "true") {
    redirect("/login");
  }
  return <>{children}</>;
}

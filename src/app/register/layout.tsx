import { redirect } from "next/navigation";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowRegister =
    process.env.IS_OWNER === "true" ||
    process.env.NEXT_PUBLIC_IS_OWNER === "true";
  if (!allowRegister) {
    redirect("/login");
  }
  return <>{children}</>;
}

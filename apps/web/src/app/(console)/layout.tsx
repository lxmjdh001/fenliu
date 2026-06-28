import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <>
      <AppShell currentUser={currentUser}>{children}</AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}

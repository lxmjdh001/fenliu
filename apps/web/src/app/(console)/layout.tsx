import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Toaster } from "sonner";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const currentUser = getCurrentUser();

  return (
    <>
      <AppShell currentUser={currentUser}>{children}</AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}

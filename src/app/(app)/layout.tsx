/**
 * Next.js layout component that wraps the /(app) route segment.
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar, MobileHeader } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  //redirect to sign in if not signed in
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.72),transparent_42%),radial-gradient(circle_at_86%_84%,rgba(82,220,205,0.26),transparent_34%)] dark:bg-[radial-gradient(circle_at_20%_12%,rgba(120,205,245,0.08),transparent_36%),radial-gradient(circle_at_86%_82%,rgba(64,152,216,0.08),transparent_34%)]" />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Next.js layout component that wraps the /(auth) route segment.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      {children}
    </div>
  );
}

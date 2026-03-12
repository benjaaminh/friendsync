/**
 * Next.js layout component that wraps the /(auth) route segment.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_66%)]" />
      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-[430px] aero-panel p-1">{children}</div>
      </div>
    </div>
  );
}

/**
 * Home page
 */
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="mx-auto max-w-md text-center space-y-8 px-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-primary">Friend</span>Cal
          </h1>
          <p className="text-xl text-muted-foreground">
            Find time together
          </p>
        </div>
        <p className="text-muted-foreground">
          Plan activities with friends in one shared calendar and todo flow.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/signin">
            <Button size="lg" className="w-full">
              Get Started
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-8 text-center">
          <div>
            <p className="text-2xl font-bold">1</p>
            <p className="text-xs text-muted-foreground">Sign in</p>
          </div>
          <div>
            <p className="text-2xl font-bold">2</p>
            <p className="text-xs text-muted-foreground">Create a group & invite friends</p>
          </div>
          <div>
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">See when everyone is free</p>
          </div>
        </div>
      </div>
    </div>
  );
}

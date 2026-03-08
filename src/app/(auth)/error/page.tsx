/**
 * Next.js page component for the /(auth)/error route segment.
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Something went wrong during sign in. Please try again.
        </p>
        <Link href="/signin">
          <Button className="w-full">Try Again</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

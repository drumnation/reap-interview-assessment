"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn("credentials", {
        username,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid username or password.");
        return;
      }
      window.location.assign(result?.url ?? callbackUrl);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-md text-gray-900 [color-scheme:light]">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="text-gray-600 mt-1">
          Use the demo username and password from your <code className="bg-gray-200 px-1 rounded text-gray-800 text-sm">.env</code> file.
        </p>
      </div>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <LogIn className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-gray-900">Credentials</CardTitle>
          </div>
          <CardDescription>
            Must match{" "}
            <code className="bg-gray-200 px-1 rounded text-gray-800">TEST_USERNAME</code> and{" "}
            <code className="bg-gray-200 px-1 rounded text-gray-800">TEST_PASSWORD</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white text-gray-900"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white text-gray-900"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

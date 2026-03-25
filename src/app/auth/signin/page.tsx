import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-12 max-w-md">
          <p className="text-center text-sm text-gray-500">Loading…</p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto px-4 py-8 max-w-md text-gray-900 [color-scheme:light]">
          <p className="text-center text-sm text-gray-600">Loading…</p>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

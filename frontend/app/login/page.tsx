"use client";

import Logo from "@/components/Logo";
import GitHubIcon from "@/components/GitHubIcon";
import PageTransition from "@/components/PageTransition";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

function LoginContent() {
  const router = useRouter();
  const { isAuthed, isLoadingAuth, loginWithGitHub } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingAuth && isAuthed) {
      router.replace("/dashboard");
    }
  }, [isAuthed, isLoadingAuth, router]);

  async function handleGitHubLogin() {
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await loginWithGitHub();
    } catch (err: any) {
      console.error("GitHub OAuth error:", err);
      setAuthError(err?.message || "Failed to initialize GitHub sign in.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f17] flex flex-col items-center justify-center px-4 py-12 transition-colors duration-200">
      <PageTransition className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo size="lg" linkTo="/" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to Tessera
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Authenticate securely with GitHub to access repository audits and AI tools.
          </p>

          {authError && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 rounded-lg text-left">
              {authError}
            </div>
          )}

          {/* GitHub button */}
          <button
            onClick={handleGitHubLogin}
            disabled={isSubmitting || isLoadingAuth}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white rounded-lg py-3 px-5 text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Redirecting to GitHub...</span>
              </>
            ) : (
              <>
                <GitHubIcon size={18} className="text-white" />
                <span>Continue with GitHub</span>
              </>
            )}
          </button>

          {/* Explanation note */}
          <div className="mt-6 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-lg text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#1a5c38] dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Tessera uses Supabase Authentication with official GitHub OAuth. Your session is securely persisted.
              </p>
            </div>
          </div>

          {/* Trust note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            Read-only access by default · No passwords stored
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Need help?{" "}
          <a href="/help" className="text-gray-600 dark:text-gray-300 hover:underline">
            View documentation
          </a>
        </div>
      </PageTransition>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f17] flex items-center justify-center transition-colors">
          <div className="text-sm text-gray-400">Loading authentication…</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

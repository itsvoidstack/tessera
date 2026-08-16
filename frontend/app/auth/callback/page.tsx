"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error || errorDescription) {
        console.error("Auth callback error:", error, errorDescription);
        setErrorMsg(errorDescription || error || "GitHub authentication was declined or failed.");
        setTimeout(() => {
          router.replace("/login");
        }, 2500);
        return;
      }

      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            setErrorMsg(exchangeError.message || "Failed to exchange authentication code.");
            setTimeout(() => {
              router.replace("/login");
            }, 2500);
            return;
          }
          router.replace("/dashboard");
          return;
        } catch (err: any) {
          console.error("Unexpected exchange error:", err);
          setErrorMsg(err?.message || "An unexpected error occurred during authentication.");
          setTimeout(() => {
            router.replace("/login");
          }, 2500);
          return;
        }
      }

      // If no code, check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col items-center justify-center p-4 transition-colors">
      {errorMsg ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center max-w-md">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            Authentication Error
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300 mb-4">{errorMsg}</p>
          <p className="text-[11px] text-gray-400">Redirecting to login page...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Loader2 className="animate-spin text-[#1a5c38] dark:text-green-400 mb-3" size={32} />
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Authenticating with GitHub
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Exchanging authorization token &amp; setting up session...
          </p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex items-center justify-center">
          <div className="text-sm text-gray-400">
            Loading authentication callback...
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

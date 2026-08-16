"use client";

import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function SignupContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f17] flex flex-col items-center justify-center px-4 py-12 transition-colors duration-200">
      <PageTransition className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" linkTo="/" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Get started with Tessera
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            You can use Tessera locally without creating an account.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white rounded-lg py-3 px-5 text-sm font-medium transition-colors shadow-sm cursor-pointer group"
          >
            <span>Open Dashboard</span>
            <ArrowRight size={15} className="text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>

          <div className="mt-6 p-3.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-lg text-left">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-[#1a5c38] dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Public repositories are analyzed through the local FastAPI backend. GitHub OAuth is disabled for now.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            Secure &amp; Private · No passwords stored
          </div>

          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[#1a5c38] dark:text-green-400 font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f17] flex items-center justify-center transition-colors">
          <div className="text-sm text-gray-400">Loading…</div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, FileQuestion } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col items-center justify-center px-4 py-16 transition-colors">
      {/* Logo */}
      <div className="mb-10">
        <Logo size="md" linkTo="/" />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center shadow-sm">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-5">
          <FileQuestion size={22} className="text-gray-400 dark:text-gray-500" />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          We couldn&apos;t find that page.
        </h1>

        {/* Explanation */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7">
          The page you&apos;re looking for doesn&apos;t exist, was moved, or the
          link might be outdated. Check the URL or head back to a safe place.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-600 dark:hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <LayoutGrid size={15} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </div>
      </div>

      {/* Error code */}
      <p className="mt-6 text-[11px] font-mono text-gray-300 dark:text-gray-600 select-none">
        HTTP 404 — Not Found
      </p>
    </div>
  );
}

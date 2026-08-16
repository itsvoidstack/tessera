"use client";

import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

const SIZES = {
  sm: { img: 22, text: "text-sm" },
  md: { img: 28, text: "text-[17px]" },
  lg: { img: 52, text: "text-2xl" },
};

export default function Logo({ size = "md", linkTo = "/" }: LogoProps) {
  const { img, text } = SIZES[size];

  const content = (
    <div
      className={`flex items-center ${
        size === "lg" ? "flex-col gap-3" : "gap-2"
      }`}
    >
      <Image
        src="/tessera-icon.svg"
        alt="Tessera logo"
        width={img}
        height={img}
        className="flex-shrink-0"
        priority
      />
      {/* text-gray-900 → also handle dark mode */}
      <span className={`font-semibold tracking-tight text-gray-900 dark:text-white ${text}`}>
        Tessera
      </span>
    </div>
  );

  if (!linkTo) return content;

  return (
    <Link
      href={linkTo}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-150"
    >
      {content}
    </Link>
  );
}

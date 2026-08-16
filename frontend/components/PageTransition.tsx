"use client";

/**
 * PageTransition — lightweight fade-in + subtle upward slide wrapper.
 * Uses the .page-enter CSS class defined in globals.css.
 * Wraps page content so every route mount gets a consistent entrance.
 *
 * Usage:
 *   <PageTransition>
 *     {children / page content}
 *   </PageTransition>
 */

interface PageTransitionProps {
  children: React.ReactNode;
  /** Extra Tailwind classes for the wrapper div */
  className?: string;
}

export default function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <div className={`page-enter h-full flex flex-col flex-1 min-h-0 ${className}`}>
      {children}
    </div>
  );
}


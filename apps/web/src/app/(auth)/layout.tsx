/**
 * Auth Route Group Layout
 *
 * Epic 2 (Clerk Authentication): Wrap this layout with <ClerkProvider> and
 * configure Clerk's appearance/localization here. Example:
 *
 *   import { ClerkProvider } from '@clerk/nextjs';
 *   ...
 *   return <ClerkProvider>{children}</ClerkProvider>;
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      {children}
    </div>
  );
}


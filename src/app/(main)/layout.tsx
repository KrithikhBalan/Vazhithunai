// Force all pages in this (main) group to be dynamically rendered.
// Firebase Auth cannot be pre-rendered at build time.
export const dynamic = "force-dynamic";

export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

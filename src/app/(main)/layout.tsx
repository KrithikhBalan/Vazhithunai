// Purpose: Layout wrapper for authenticated (main) application routes, enforcing dynamic server rendering for user dashboards and trip views.

export const dynamic = "force-dynamic";

export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

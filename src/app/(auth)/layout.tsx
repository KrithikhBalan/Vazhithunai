// Purpose: Layout for the (auth) route group enforcing dynamic server rendering for all authentication screens (Splash & Login).

export const dynamic = "force-dynamic";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

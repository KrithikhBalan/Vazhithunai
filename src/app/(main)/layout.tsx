// Purpose: Layout wrapper for authenticated (main) application routes, providing dynamic server rendering and persistent bottom navigation dock.

import { BottomNavBar } from "@/components/navigation/BottomNavBar";

export const dynamic = "force-dynamic";

export default function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomNavBar />
    </>
  );
}

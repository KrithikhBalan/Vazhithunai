// Purpose: Root entry point (/) of the Vazhithunai web app. Automatically redirects visitors to the /splash onboarding screen.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/splash");
}

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data/host";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  // Setup is a one-time flow; a host who has finished it belongs in the app.
  if (profile.onboarding_completed_at) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-ground">{children}</div>
  );
}

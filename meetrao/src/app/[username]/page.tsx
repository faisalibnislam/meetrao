import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { MeetingChooser } from "@/components/booking/meeting-chooser";
import { loadBookingPage } from "@/lib/booking/page-data";
import { getPublicHost } from "@/lib/booking/service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const host = await getPublicHost(username);
  if (!host) return { title: "Not found" };
  return {
    title: `Book a time with ${host.full_name || host.username}`,
    description: "Pick a time that works — every booking gets a Google Meet link.",
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await loadBookingPage(username);

  if (result.kind === "not_found") notFound();
  if (result.kind === "choose") {
    return <MeetingChooser host={result.host} types={result.types} />;
  }
  return <BookingFlow data={result.data} />;
}

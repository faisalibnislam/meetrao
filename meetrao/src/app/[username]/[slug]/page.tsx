import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking/booking-flow";
import { loadBookingPage } from "@/lib/booking/page-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await loadBookingPage(username, slug);
  if (result.kind !== "page") return { title: "Not found" };
  return {
    title: `${result.data.meetingName} with ${result.data.hostName}`,
    description:
      result.data.meetingDescription ||
      "Pick a time that works — every booking gets a Google Meet link.",
  };
}

export default async function PublicMeetingBookingPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const result = await loadBookingPage(username, slug);

  if (result.kind !== "page") notFound();
  return <BookingFlow data={result.data} />;
}

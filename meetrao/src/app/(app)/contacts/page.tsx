import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { ContactsScreen } from "@/components/app/contacts-screen";
import { listContacts } from "@/lib/data/contacts";
import { requireOnboardedSession } from "@/lib/data/session";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const { userId, profile } = await requireOnboardedSession();
  const contacts = await listContacts(userId, profile.timezone);

  return (
    <AppScreen title="Contacts" subtitle="Everyone you have met through Meetrao, and anyone else you add.">
      <ContactsScreen contacts={contacts} />
    </AppScreen>
  );
}

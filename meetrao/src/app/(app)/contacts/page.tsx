import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { ContactsScreen } from "@/components/app/contacts-screen";
import { listContactsForScreen } from "@/lib/data/contacts";
import { activeContext } from "@/lib/data/context";
import { requireOnboardedSession } from "@/lib/data/session";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const { userId, profile } = await requireOnboardedSession();
  const { contacts, elsewhere } = await listContactsForScreen(userId, profile.timezone);
  const context = await activeContext();

  return (
    <AppScreen title="Contacts" subtitle="Everyone you have met through Meetrao, and anyone else you add.">
      <ContactsScreen contacts={contacts} elsewhere={elsewhere} here={context.name} />
    </AppScreen>
  );
}

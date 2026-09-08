import type { Metadata } from "next";
import { AppScreen } from "@/components/app/app-screen";
import { AdminUsersTable } from "@/components/admin/admin-tables";
import { listUsers } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const users = await listUsers("");
  return (
    <AppScreen title="Users">
      <AdminUsersTable users={users} />
    </AppScreen>
  );
}

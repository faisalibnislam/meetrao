"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireSession } from "@/lib/data/session";
import { CONTEXT_COOKIE, contextChoices } from "@/lib/data/context";

/* Switching company. The cookie is a preference and is validated on every
   read in lib/data/context.ts, but it is also checked here so a bad value
   never gets written in the first place. */

export async function setContext(companyId: string | null): Promise<{ error?: string }> {
  await requireSession();

  const jar = await cookies();
  if (!companyId) {
    jar.delete(CONTEXT_COOKIE);
    revalidatePath("/", "layout");
    return {};
  }

  const choices = await contextChoices();
  if (!choices.some((c) => c.id === companyId)) return { error: "That is not one of your companies." };

  jar.set(CONTEXT_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return {};
}

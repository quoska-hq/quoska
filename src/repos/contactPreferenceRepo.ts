import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactConsentEvent } from "@/types/contact-preferences";

export async function getOwnContactEvents(client: SupabaseClient): Promise<ContactConsentEvent[]> {
  const rows: ContactConsentEvent[] = [];
  for (let offset = 0; ; offset += 1000) {
    // RLS restricts this to the requesting user; never use an admin client here.
    const { data, error } = await client.from("admin_contact_events")
      .select("id,email,enabled,text_version,consent_text,source,created_at")
      .order("id").range(offset, offset + 999);
    if (error || !data) throw new Error("E-Mail-Einwilligungen konnten nicht geladen werden.");
    rows.push(...data as ContactConsentEvent[]);
    if (data.length < 1000) return rows;
  }
}

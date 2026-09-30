import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee } from "@/types/database";
import type { EmployeeListResponse } from "@/types/employee";
export async function employeeInvitationStatus(
  adminClient: SupabaseClient,
  active: Employee[],
): Promise<EmployeeListResponse["invitationStatus"]> {
  const invitationStatus: EmployeeListResponse["invitationStatus"] = {};
  // The local invitation token is retained after acceptance. Auth confirmation
  // is authoritative, including for invitations accepted before this change.
  // Bound concurrent requests to avoid a burst for larger teams.
  for (let offset = 0; offset < active.length; offset += 5) {
    await Promise.all(
      active.slice(offset, offset + 5).map(async (employee) => {
        if (!employee.invitation_token && !employee.invited_at) {
          invitationStatus[employee.id] = false;
          return;
        }
        try {
          const { data, error } = await adminClient.auth.admin.getUserById(
            employee.user_id,
          );
          invitationStatus[employee.id] =
            error || !data.user
              ? null
              : Boolean(data.user.invited_at && !data.user.email_confirmed_at);
        } catch {
          // Keep the list usable without claiming an unverified invite is pending.
          invitationStatus[employee.id] = null;
        }
      }),
    );
  }

  return invitationStatus;
}

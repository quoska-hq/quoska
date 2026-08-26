/**
 * /app/notifications — Notification inbox page.
 */

import { NotificationInbox } from "@/components/notification-inbox";
import { PageHeader } from "@/components/page-header";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Benachrichtigungen"
        description="Hinweise, Anträge und Änderungen im Überblick"
      />
      <NotificationInbox />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  ClipboardList,
  Clock,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Palmtree,
  Settings,
  Thermometer,
  Users,
  X,
} from "lucide-react";
import type { Role } from "@/types";
import { NotificationBadge } from "@/components/notification-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MobileNavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  roles: Role[];
  siteAdminOnly?: boolean;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    href: "/app/dashboard",
    label: "Cockpit",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    href: "/app/clock",
    label: "Stempeln",
    icon: Clock,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/my-times",
    label: "Meine Zeiten",
    shortLabel: "Zeiten",
    icon: ClipboardList,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/notifications",
    label: "Benachrichtigungen",
    shortLabel: "Meldungen",
    icon: Bell,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/vacation",
    label: "Urlaub",
    icon: Palmtree,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/sick",
    label: "Krankmeldung",
    icon: Thermometer,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/employees",
    label: "Mitarbeiter",
    shortLabel: "Team",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/projects",
    label: "Projekte",
    icon: Briefcase,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/reports",
    label: "Berichte",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/site-analytics",
    label: "Website-Analytics",
    icon: Globe2,
    roles: ["admin"],
    siteAdminOnly: true,
  },
  {
    href: "/app/settings",
    label: "Einstellungen",
    icon: Settings,
    roles: ["admin", "manager", "employee"],
  },
];

const PRIMARY_HREFS: Record<Role, string[]> = {
  admin: ["/app/dashboard", "/app/clock", "/app/my-times", "/app/employees"],
  manager: ["/app/clock", "/app/my-times", "/app/employees", "/app/reports"],
  employee: ["/app/clock", "/app/my-times", "/app/notifications", "/app/vacation"],
};

interface BottomNavProps {
  role: Role;
  userName: string;
  isAnalyticsAdmin: boolean;
  onSignOut: () => void | Promise<void>;
}

export function BottomNav({
  role,
  userName,
  isAnalyticsAdmin,
  onSignOut,
}: BottomNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleItems = MOBILE_NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && (!item.siteAdminOnly || isAnalyticsAdmin),
  );
  const primaryHrefs = PRIMARY_HREFS[role];
  const primaryItems = primaryHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter((item): item is MobileNavItem => Boolean(item));
  const moreItems = visibleItems.filter((item) => !primaryHrefs.includes(item.href));
  const moreIsActive = moreItems.some((item) => pathname.startsWith(item.href));

  const closeMenu = () => setMenuOpen(false);
  const signOut = () => {
    closeMenu();
    void onSignOut();
  };

  return (
    <>
      <nav
        aria-label="Hauptnavigation"
        data-testid="mobile-bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 w-full max-w-full border-t border-slate-900/15 bg-[#efede7]/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm [contain:layout_paint] md:hidden"
      >
        <div className="grid h-16 w-full grid-cols-5 items-stretch">
          {primaryItems.map((item) => (
            <BottomNavLink
              key={item.href}
              item={item}
              active={pathname.startsWith(item.href)}
            />
          ))}
          <button
            type="button"
            aria-label="Mehr Navigation öffnen"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
              moreIsActive || menuOpen ? "text-[#5548ba]" : "text-slate-500"
            }`}
          >
            <Menu className="size-5" strokeWidth={moreIsActive || menuOpen ? 2.5 : 2} />
            <span className={`max-w-full truncate text-[10px] ${moreIsActive || menuOpen ? "font-semibold" : "font-medium"}`}>
              Mehr
            </span>
          </button>
        </div>
      </nav>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          showCloseButton={false}
          initialFocus={false}
          data-testid="mobile-more-menu"
          className="top-auto! right-0! bottom-0! left-0! max-h-[min(78dvh,38rem)] w-full max-w-none! translate-x-0! translate-y-0! gap-0 overflow-x-hidden bg-white! p-0! overflow-y-auto rounded-t-xl rounded-b-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between gap-3 border-b border-slate-900/10 bg-white px-4 py-4 text-left">
            <div className="min-w-0">
              <DialogTitle>Mehr</DialogTitle>
              <p className="mt-1 truncate text-xs text-muted-foreground">{userName}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Menü schließen"
              onClick={closeMenu}
            >
              <X className="size-5" />
            </Button>
          </DialogHeader>

          <nav aria-label="Weitere Navigation" className="grid grid-cols-1 gap-1 p-3 min-[380px]:grid-cols-2">
            {moreItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                  className={`flex min-h-13 min-w-0 items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#6658d3]/25 bg-[#6658d3]/10 text-[#5548ba]"
                      : "border-transparent text-slate-700 hover:border-slate-900/10 hover:bg-slate-100"
                  }`}
                >
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-[#6658d3] shadow-sm">
                    <Icon className="size-[18px]" />
                    {item.href === "/app/notifications" && (
                      <NotificationBadge className="absolute -top-2 -right-2" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-900/10 p-3">
            <Button
              type="button"
              variant="ghost"
              onClick={signOut}
              className="h-11 w-full justify-start gap-3 text-slate-600"
            >
              <LogOut className="size-[18px]" />
              Abmelden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BottomNavLink({
  item,
  active,
}: {
  item: MobileNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
        active ? "text-[#5548ba]" : "text-slate-500"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      <span className={`max-w-full truncate text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
        {item.shortLabel ?? item.label}
      </span>
      {item.href === "/app/notifications" && (
        <NotificationBadge className="absolute top-1.5 right-[18%]" />
      )}
    </Link>
  );
}

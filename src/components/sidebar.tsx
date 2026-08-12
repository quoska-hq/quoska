"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Role } from "@/types";
import { NotificationBadge } from "@/components/notification-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  ClipboardList,
  Bell,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Palmtree,
  Thermometer,
  Briefcase,
  LayoutDashboard,
  Globe2,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  group: "main" | "manage";
  siteAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app/dashboard",
    label: "Cockpit",
    icon: <LayoutDashboard className="size-[18px]" />,
    roles: ["admin"],
    group: "manage",
  },
  {
    href: "/app/clock",
    label: "Stempeln",
    icon: <Clock className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/my-times",
    label: "Meine Zeiten",
    icon: <ClipboardList className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/notifications",
    label: "Benachrichtigungen",
    icon: <Bell className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/vacation",
    label: "Urlaub",
    icon: <Palmtree className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/sick",
    label: "Krankmeldung",
    icon: <Thermometer className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/employees",
    label: "Mitarbeiter",
    icon: <Users className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/projects",
    label: "Projekte",
    icon: <Briefcase className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/reports",
    label: "Berichte",
    icon: <BarChart3 className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/site-analytics",
    label: "Website-Analytics",
    icon: <Globe2 className="size-[18px]" />,
    roles: ["admin"],
    group: "manage",
    siteAdminOnly: true,
  },
  {
    href: "/app/settings",
    label: "Einstellungen",
    icon: <Settings className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
];

interface SidebarProps {
  role: Role;
  userName: string;
  isAnalyticsAdmin: boolean;
  onSignOut: () => void;
}

export function Sidebar({ role, userName, isAnalyticsAdmin, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(role) && (!item.siteAdminOnly || isAnalyticsAdmin),
  );
  const mainItems = visibleItems.filter((i) => i.group === "main");
  const manageItems = visibleItems.filter((i) => i.group === "manage");

  return (
    <aside className="fixed inset-y-0 hidden border-r border-slate-900/15 bg-[#efede7] md:flex md:w-[260px] md:flex-col">
      {/* Logo */}
      <Link
        href="/app/dashboard"
        data-testid="sidebar-header"
        className="flex h-16 items-center gap-2 border-b border-slate-900/15 bg-[#f8f7f3] px-5"
      >
        <Image
          src="/icons/logo.png"
          alt="Quoska"
          width={122}
          height={125}
          className="h-[26px] w-auto shrink-0"
        />
        <span className="text-base font-bold tracking-[-0.03em] text-slate-950">
          Quoska
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        <div className="space-y-0.5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Zeiterfassung
          </p>
          {mainItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={pathname.startsWith(item.href)}
              showNotificationBadge={item.href === "/app/notifications"}
            />
          ))}
        </div>

        {manageItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Verwaltung
            </p>
            {manageItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                isActive={pathname.startsWith(item.href)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-900/15 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-[#dcd8cf] text-[#5548ba] text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="size-8 shrink-0 text-slate-500 hover:bg-transparent hover:text-[#6658d3]"
            aria-label="Abmelden"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavItemLink({
  item,
  isActive,
  showNotificationBadge,
}: {
  item: NavItem;
  isActive: boolean;
  showNotificationBadge?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2.5 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "border-[#6658d3] bg-white/70 text-slate-950"
          : "border-transparent text-slate-500 hover:border-slate-400 hover:text-slate-950"
      }`}
    >
      {isActive ? (
        <span className="text-[#6658d3]">{item.icon}</span>
      ) : (
        <span className="text-slate-400">{item.icon}</span>
      )}
      <span>{item.label}</span>
      {showNotificationBadge && <NotificationBadge />}
    </Link>
  );
}

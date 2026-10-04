"use client";

import Image from "next/image";
import {
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock3,
  LayoutGrid,
  RotateCcw,
  Store,
  Users,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PlanningTab } from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningShell({
  children,
  tab,
  onTab,
  onInfo,
  onReset,
}: {
  children: ReactNode;
  tab: PlanningTab;
  onTab: (tab: PlanningTab) => void;
  onInfo: () => void;
  onReset: () => void;
}) {
  return (
    <div className={styles.shell}>
      <aside
        className={styles.sidebar}
        aria-label="Navigation der Vorabversion"
      >
        <div className={styles.brand}>
          <Image src="/icons/logo.png" alt="" width={27} height={28} />
          Quoska
        </div>
        <div className={styles.business}>
          <Store size={20} className="text-stone-500" />
          <div>
            <strong className="block text-xs font-semibold">
              Bäckerei Morgenrot
            </strong>
            <span className="mt-1 block text-[10px] text-stone-400">
              Beispielbetrieb · 2 Filialen
            </span>
          </div>
        </div>
        <div className={`${styles.eyebrow} px-6 pb-3`}>Arbeitsalltag</div>
        <nav className={styles.nav}>
          <button onClick={() => onTab("plan")} data-active={tab === "plan"}>
            <CalendarDays className="size-[17px]" />
            Dienstplanung
            <span className="ml-auto text-[9px] opacity-70">NEU</span>
          </button>
          <button onClick={() => onTab("mine")} data-active={tab === "mine"}>
            <Clock3 size={17} />
            Meine Dienste
          </button>
          <button onClick={() => onTab("team")} data-active={tab === "team"}>
            <Users size={17} />
            Team & Regeln
          </button>
        </nav>
        <div className={`${styles.eyebrow} px-6 pb-3 pt-8`}>Vorabversion</div>
        <nav className={styles.nav}>
          <button onClick={onInfo}>
            <CircleHelp size={17} />
            Was ist schon möglich?
          </button>
          <button onClick={onReset}>
            <RotateCcw size={17} />
            Beispiel zurücksetzen
          </button>
        </nav>
        <div className="mx-4 mt-9 rounded-lg border border-[#d8d1eb] bg-[#eae6f2] p-3.5">
          <WandSparkles size={19} className="mb-2 text-[#8c7abb]" />
          <p className="text-xs font-medium text-[#6f5f91]">
            Planung, die mitdenkt.
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#998cae]">
            Kompetenzen, Urlaub und Stunden gemeinsam im Blick.
          </p>
        </div>
        <div className={styles.sidebarFoot}>
          <span className={`${styles.avatar} bg-[#e2ddec]`}>PL</span>
          <div>
            <strong className="block font-medium">Planungsleitung</strong>
            <span className="text-[10px] text-stone-400">
              Ansicht im Beispielbetrieb
            </span>
          </div>
        </div>
      </aside>
      <div className={styles.main}>
        <div className={styles.topbar}>
          <span className="flex items-center gap-2">
            <LayoutGrid size={13} className="hidden sm:block" />
            <span className="hidden sm:inline">Arbeitsalltag</span>
            <ChevronRight size={12} className="hidden sm:block" />
            <span className="hidden sm:inline">Dienstplanung</span>
            <span className="sm:hidden">Quoska</span>
          </span>
          <button className={styles.previewBadge} onClick={onInfo}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#9686d6]" />
            Vorabversion · Beispieldaten
          </button>
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

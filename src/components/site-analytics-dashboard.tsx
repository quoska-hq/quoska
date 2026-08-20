import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  Eye,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsCount, SiteAnalyticsSummary } from "@/types/site-analytics";

const PERIODS = [7, 30, 90] as const;

const REGION_NAMES: Record<string, string> = {
  "DE-BE": "Berlin", "DE-BB": "Brandenburg", "DE-BW": "Baden-Württemberg",
  "DE-BY": "Bayern", "DE-HB": "Bremen", "DE-HE": "Hessen",
  "DE-HH": "Hamburg", "DE-MV": "Mecklenburg-Vorpommern",
  "DE-NI": "Niedersachsen", "DE-NW": "Nordrhein-Westfalen",
  "DE-RP": "Rheinland-Pfalz", "DE-SH": "Schleswig-Holstein",
  "DE-SL": "Saarland", "DE-SN": "Sachsen", "DE-ST": "Sachsen-Anhalt",
  "DE-TH": "Thüringen", DE: "Deutschland",
};

const DEVICE_NAMES: Record<string, string> = {
  desktop: "Desktop", tablet: "Tablet", mobile: "Mobil",
};

const TOOL_EVENT_NAMES: Record<string, string> = {
  arbeitszeitrechner: "Arbeitszeitrechner",
  stundenzettel: "Stundenzettel",
  ueberstundenrechner: "Überstundenrechner",
  "monatsarbeitszeit-rechner": "Monatsarbeitszeit",
  free_tool_view: "Aufruf",
  free_tool_calculate: "Berechnung",
  free_tool_export: "Export",
  free_tool_product_click: "Produkt-Klick",
  free_tool_signup_start: "Registrierung",
};

export function SiteAnalyticsDashboard({ summary }: { summary: SiteAnalyticsSummary }) {
  const maxDaily = Math.max(...summary.daily.map((point) => point.pageviews), 1);

  return (
    <div className="space-y-6" data-testid="site-analytics-dashboard">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
            Quoska Website
          </p>
          <h1 className="text-3xl text-slate-950">Besucher-Analytics</h1>
          <p className="mt-2 text-sm text-slate-500">
            Cookie-frei · täglich neue Besucherkennung · 180 Tage Aufbewahrung
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-slate-900/15 bg-white p-1">
            {PERIODS.map((days) => (
              <Link
                key={days}
                href={`/app/site-analytics?days=${days}`}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  summary.days === days
                    ? "bg-slate-950 text-white"
                    : "text-slate-500 hover:text-slate-950"
                }`}
              >
                {days} Tage
              </Link>
            ))}
          </div>
          <Link
            href={`/app/site-analytics?days=${summary.days}`}
            className="inline-flex h-8 items-center gap-2 border border-slate-900/15 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-900/30 hover:text-slate-950"
          >
            <RefreshCw className="size-3.5" /> Aktualisieren
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users />} label="Besucher" value={formatNumber(summary.visitors)} note={`${summary.todayVisitors} heute`} />
        <MetricCard icon={<Eye />} label="Seitenaufrufe" value={formatNumber(summary.pageviews)} note={`${summary.todayPageviews} heute`} />
        <MetricCard icon={<MousePointerClick />} label="Aufrufe / Besucher" value={summary.viewsPerVisitor.toLocaleString("de-DE", { maximumFractionDigits: 1 })} note="im gewählten Zeitraum" />
        <MetricCard icon={<ArrowDownRight />} label="Direktzugriffe" value={`${Math.round(summary.directShare)} %`} note="ohne Referrer oder Kampagne" />
      </div>

      <Card className="bg-white">
        <CardHeader className="flex-row items-center justify-between border-b">
          <div>
            <CardTitle>Verlauf</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Seitenaufrufe pro Tag</p>
          </div>
          <Activity className="size-4 text-[#6658d3]" />
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex h-52 items-end gap-1 border-b border-slate-900/10 pt-8 sm:gap-1.5">
            {summary.daily.map((point, index) => (
              <div key={point.date} className="group relative flex h-full min-w-0 flex-1 items-end">
                <div
                  className="w-full min-h-0.5 bg-[#6658d3]/75 transition-colors group-hover:bg-[#5548ba]"
                  style={{ height: `${Math.max((point.pageviews / maxDaily) * 100, 1)}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-slate-900/15 bg-slate-950 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
                  {formatDate(point.date)} · {point.pageviews} Aufrufe · {point.visitors} Besucher
                </div>
                {showDateLabel(index, summary.daily.length) && (
                  <span className="absolute top-full left-1/2 mt-2 -translate-x-1/2 text-[10px] text-slate-400">
                    {formatShortDate(point.date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankingCard title="Top-Seiten" icon={<MousePointerClick />} rows={summary.pages} empty="Noch keine Seitenaufrufe" />
        <RankingCard title="Quellen" icon={<ArrowDownRight />} rows={summary.sources} empty="Noch keine Referrer" />
        <RankingCard title="Regionen" icon={<Globe2 />} rows={summary.regions.map((row) => ({ ...row, label: REGION_NAMES[row.label] ?? row.label }))} empty="Noch keine Regionen" />
        <RankingCard title="Geräte" icon={<Activity />} rows={summary.devices.map((row) => ({ ...row, label: DEVICE_NAMES[row.label] ?? row.label }))} empty="Noch keine Geräte" />
      </div>

      {summary.campaigns.length > 0 && (
        <RankingCard title="Kampagnen" icon={<MousePointerClick />} rows={summary.campaigns} empty="Noch keine Kampagnen" />
      )}

      {(summary.toolActivity.length > 0 || summary.toolConversions.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankingCard title="Kostenlose Tools" icon={<Activity />} rows={translateToolEvents(summary.toolActivity)} empty="Noch keine Tool-Nutzung" />
          <RankingCard title="Tool-Conversions" icon={<MousePointerClick />} rows={translateToolEvents(summary.toolConversions)} empty="Noch keine Tool-Conversions" />
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <Card className="gap-3 bg-white">
      <CardContent>
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <span className="text-[#6658d3] [&>svg]:size-4">{icon}</span>
        </div>
        <p className="font-mono text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-400">{note}</p>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: AnalyticsCount[]; empty: string }) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <Card className="bg-white">
      <CardHeader className="flex-row items-center justify-between border-b">
        <CardTitle>{title}</CardTitle>
        <span className="text-[#6658d3] [&>svg]:size-4">{icon}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? <p className="py-5 text-sm text-slate-400">{empty}</p> : rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-slate-700" title={row.label}>{row.label}</span>
              <span className="font-mono text-xs font-semibold text-slate-950">{formatNumber(row.count)}</span>
            </div>
            <div className="h-1.5 bg-[#ebe8e0]">
              <div className="h-full bg-[#6658d3]/70" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number): string { return value.toLocaleString("de-DE"); }
function formatDate(value: string): string { const [y, m, d] = value.split("-"); return `${d}.${m}.${y}`; }
function formatShortDate(value: string): string { const [, m, d] = value.split("-"); return `${d}.${m}.`; }
function showDateLabel(index: number, length: number): boolean {
  const step = length <= 7 ? 1 : length <= 30 ? 6 : 18;
  return index === 0 || index === length - 1 || index % step === 0;
}

function translateToolEvents(rows: AnalyticsCount[]): AnalyticsCount[] {
  return rows.map((row) => ({
    ...row,
    label: row.label
      .split(" · ")
      .map((part) => TOOL_EVENT_NAMES[part] ?? part)
      .join(" · "),
  }));
}

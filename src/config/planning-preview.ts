import type {
  PlanningAbsence,
  PlanningEmployee,
  PlanningLocation,
  PlanningMonth,
  PlanningTemplate,
} from "@/types/planning-preview";

// Fictional sample business. No customer or production data is used here.
export const PLANNING_LOCATIONS: PlanningLocation[] = [
  { id: "markt", name: "Am Marktplatz", address: "Marktplatz 4" },
  { id: "bahnhof", name: "Am Bahnhof", address: "Bahnhofstraße 12" },
];

export const PLANNING_TEMPLATES: PlanningTemplate[] = [
  {
    id: "backen",
    name: "Backstube",
    start: 240,
    end: 720,
    breakMinutes: 30,
    skills: ["Backstube"],
    tone: "violet",
  },
  {
    id: "frueh",
    name: "Frühdienst",
    start: 360,
    end: 840,
    breakMinutes: 30,
    skills: ["Verkauf", "Schlüssel"],
    tone: "blue",
  },
  {
    id: "spaet",
    name: "Spätdienst",
    start: 720,
    end: 1200,
    breakMinutes: 30,
    skills: ["Verkauf"],
    tone: "amber",
  },
];

export const PLANNING_EMPLOYEES: PlanningEmployee[] = [
  {
    id: "e1",
    name: "Anna Weber",
    initials: "AW",
    weeklyHours: 38,
    balanceHours: 6.5,
    skills: ["Backstube", "Verkauf", "Schlüssel"],
    locations: ["markt", "bahnhof"],
    color: "#e7dcf6",
  },
  {
    id: "e2",
    name: "Jonas Müller",
    initials: "JM",
    weeklyHours: 38,
    balanceHours: -2,
    skills: ["Backstube"],
    locations: ["markt", "bahnhof"],
    color: "#dce8f7",
  },
  {
    id: "e3",
    name: "Emil Schneider",
    initials: "ES",
    weeklyHours: 32,
    balanceHours: 4,
    skills: ["Backstube"],
    locations: ["markt", "bahnhof"],
    color: "#e4ecda",
  },
  {
    id: "e4",
    name: "Mia Fischer",
    initials: "MF",
    weeklyHours: 32,
    balanceHours: 0,
    skills: ["Backstube", "Verkauf"],
    locations: ["markt", "bahnhof"],
    color: "#f3e0d6",
  },
  {
    id: "e5",
    name: "Lena Hoffmann",
    initials: "LH",
    weeklyHours: 38,
    balanceHours: 3.5,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["markt", "bahnhof"],
    color: "#dcebe7",
  },
  {
    id: "e6",
    name: "Ben Wagner",
    initials: "BW",
    weeklyHours: 32,
    balanceHours: -3,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["markt", "bahnhof"],
    color: "#e4dff5",
  },
  {
    id: "e7",
    name: "Clara Becker",
    initials: "CB",
    weeklyHours: 30,
    balanceHours: 2,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["markt"],
    color: "#f4e4cd",
  },
  {
    id: "e8",
    name: "Paul Richter",
    initials: "PR",
    weeklyHours: 30,
    balanceHours: -1.5,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["bahnhof"],
    color: "#dee7f1",
  },
  {
    id: "e9",
    name: "Sophie Klein",
    initials: "SK",
    weeklyHours: 30,
    balanceHours: 1,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["markt", "bahnhof"],
    color: "#e9dfec",
  },
  {
    id: "e10",
    name: "Noah Wolf",
    initials: "NW",
    weeklyHours: 24,
    balanceHours: -4,
    skills: ["Verkauf", "Schlüssel"],
    locations: ["markt", "bahnhof"],
    color: "#dfeada",
  },
  {
    id: "e11",
    name: "Lea Schmitt",
    initials: "LS",
    weeklyHours: 24,
    balanceHours: 0,
    skills: ["Verkauf"],
    locations: ["markt", "bahnhof"],
    color: "#f5dedb",
  },
  {
    id: "e12",
    name: "Felix Braun",
    initials: "FB",
    weeklyHours: 24,
    balanceHours: 2.5,
    skills: ["Verkauf"],
    locations: ["markt", "bahnhof"],
    color: "#e1e6f1",
  },
];

export const PLANNING_MONTHS: PlanningMonth[] = [
  { id: "2026-10", name: "Oktober", status: "fixed" },
  { id: "2026-11", name: "November", status: "announced" },
  { id: "2026-12", name: "Dezember", status: "announced" },
];

export const PLANNING_ABSENCES: PlanningAbsence[] = [
  { employeeId: "e1", from: "2026-11-02", to: "2026-11-06", label: "Urlaub" },
  { employeeId: "e7", from: "2026-11-09", to: "2026-11-13", label: "Urlaub" },
  { employeeId: "e6", from: "2026-12-21", to: "2026-12-27", label: "Urlaub" },
];

export const PLANNING_STATUS = {
  fixed: {
    label: "Verbindlich",
    detail: "Freigegeben · Änderungen gesperrt",
    color: "text-emerald-700 bg-emerald-50",
  },
  announced: {
    label: "Angekündigt",
    detail: "Sichtbar für das Team · Tausch möglich",
    color: "text-blue-700 bg-blue-50",
  },
  draft: {
    label: "Entwurf",
    detail: "In Planung · nur für die Planungsleitung",
    color: "text-stone-600 bg-stone-100",
  },
} as const;

export const PREVIEW_REST_MINUTES = 11 * 60;
// The multiplier converts hours to minutes; it is not an hourly limit.
// eslint-disable-next-line @quoska/legal/enforce-max-working-hours
export const PREVIEW_WEEKLY_MAX_MINUTES = 40 * 60;

import { legalInfo } from "@/lib/site";

/** One contact for unlimited teams and individual product requirements. */
export const ENTERPRISE_CONTACT_URL = `mailto:${legalInfo.email}?subject=${encodeURIComponent("Enterprise-Anfrage für Quoska")}&body=${encodeURIComponent("Hallo Quoska-Team,\n\nwir interessieren uns für ein individuelles Angebot.\n\nBetrieb und Teamgröße: \nGewünschte Funktionen, Integrationen oder Automatisierungen: \n\nViele Grüße")}`;

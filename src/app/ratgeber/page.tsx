// Portfolio SEO guide index v1; generated from public guide metadata.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";
export const metadata: Metadata = {"title": "Anleitungen für dein Team", "description": "Anleitungen und Checklisten für den Einstieg in die Zeiterfassung und die Werkzeuge von Quoska.", "alternates": {"canonical": "/ratgeber"}};
export default function GuideIndex() { return (<MarketingPageShell eyebrow="Ratgeber und Checklisten" title={"Anleitungen für dein Team"} intro={"Anleitungen und Checklisten für den Einstieg in die Zeiterfassung und die Werkzeuge von Quoska."} cta={false}><article className="mx-auto max-w-5xl px-5 py-10 sm:px-6 space-y-8 [&_h2]:font-serif [&_h2]:text-3xl [&_p]:my-4 [&_p]:leading-7 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:text-[#5145ad]" style={{overflowWrap:"anywhere"}}><ul>
<li><h2><Link href={"/ratgeber/ersatzruhetag-sonntag-feiertag-planen"}>{"Ersatzruhetag nach Sonntags- oder Feiertagsarbeit planen"}</Link></h2><p>{"Zwei oder acht Wochen? Beispiele zeigen, wie Ersatzruhetage nach Sonn- und Feiertagsarbeit mit dem Beschäftigungstag und der Ruhezeit zusammenpassen."}</p></li>
</ul></article></MarketingPageShell>); }

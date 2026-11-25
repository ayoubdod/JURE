import React from "react";
import { Calendar, Sparkles } from "lucide-react";
import type { MarketingLocale } from "@/marketing/site";
import { SHOWCASE_UI, type ShowcaseUi } from "@/marketing/content/workspaceShowcase";

/**
 * Locale-aware hero product preview.
 * Mobile shows one zoomed matter screen. Desktop shows the same matter
 * inside an app window, so copy always matches en / fr / ar.
 */

function fileKind(name: string): "PDF" | "DOC" {
  return name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC";
}

const FileChip: React.FC<{ name: string }> = ({ name }) => {
  const kind = fileKind(name);
  return (
    <span
      className={`inline-flex h-6 min-w-[2.15rem] items-center justify-center rounded-md px-1 text-[9px] font-extrabold tracking-wide ${
        kind === "PDF" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"
      }`}
      aria-hidden
    >
      {kind}
    </span>
  );
};

const MatterBody: React.FC<{ ui: ShowcaseUi; dense?: boolean }> = ({ ui, dense = false }) => {
  const docs = dense ? ui.docs.slice(0, 2) : ui.docs.slice(0, 3);
  const hearing = ui.events[1];

  return (
    <div className={dense ? "space-y-3.5" : "space-y-3"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold tracking-tight text-[#171321] ${dense ? "text-[17px] leading-snug" : "text-[15px]"}`}>
            {ui.matter}
          </p>
          <p className={`mt-0.5 text-[#5c5670] ${dense ? "text-sm" : "text-[12px]"}`}>{ui.matterType}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          {ui.status}
        </span>
      </div>

      <div className={`grid gap-2 ${dense ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="rounded-xl border border-[#20004d]/10 bg-[#f7f6fb] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b6fd1]">{ui.client}</p>
          <p className={`mt-1 font-medium text-[#171321] ${dense ? "text-sm" : "text-[12px]"}`}>{ui.contactName}</p>
          <p className="text-[11px] text-[#6b6280]">{ui.contactRole}</p>
        </div>
        <div className="rounded-xl border border-[#20004d]/10 bg-white px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b6fd1]">{hearing.kind}</p>
          <p className={`mt-1 flex items-center gap-1.5 font-medium text-[#171321] ${dense ? "text-sm" : "text-[12px]"}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#2949E8]" aria-hidden />
            <span className="truncate">{hearing.title}</span>
          </p>
          <p className="text-[11px] text-[#6b6280]">{hearing.time}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {docs.map((doc) => (
          <li
            key={doc}
            className="flex items-center gap-2.5 rounded-xl border border-[#20004d]/8 bg-white px-2.5 py-2"
          >
            <FileChip name={doc} />
            <span className={`min-w-0 flex-1 truncate font-medium text-[#171321] ${dense ? "text-[13px]" : "text-[12px]"}`}>
              {doc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const JuriaSummary: React.FC<{ ui: ShowcaseUi; dense?: boolean }> = ({ ui, dense = false }) => (
  <div className="rounded-xl border border-[#2949E8]/15 bg-gradient-to-br from-[#f4f0ff] to-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2949E8] to-[#A855F7]">
          <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-[#171321]">JURIA</span>
      </div>
      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-none text-amber-800">
        {ui.awaitingReview}
      </span>
    </div>
    <p className={`mt-2.5 leading-relaxed text-[#3c3650] ${dense ? "text-[13px]" : "text-[12px] line-clamp-4"}`}>
      {ui.answer}
    </p>
    <p className="mt-2 text-[10px] font-medium text-[#8b6fd1]">{ui.aiLabel}</p>
  </div>
);

const HeroMatterPreview: React.FC<{ lang: MarketingLocale; label: string }> = ({ lang, label }) => {
  const ui = SHOWCASE_UI[lang];

  return (
    <div className="landing-hero-preview" role="img" aria-label={label}>
      <div className="md:hidden overflow-hidden rounded-[1.35rem] border border-white/70 bg-white text-start shadow-[0_28px_70px_-28px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2 border-b border-[#20004d]/8 bg-[#f7f6fb] px-4 py-2.5">
          <span className="text-[10px] font-bold tracking-[0.18em] text-[#2949E8]">JURE</span>
          <span className="h-3 w-px bg-[#20004d]/15" aria-hidden />
          <span className="truncate text-[12px] font-medium text-[#5c5670]">{ui.nav.cases}</span>
        </div>
        <div className="space-y-3.5 p-4">
          <MatterBody ui={ui} dense />
          <JuriaSummary ui={ui} dense />
        </div>
      </div>

      <div className="hidden md:block overflow-hidden rounded-[1.35rem] border border-white/50 bg-white text-start shadow-[0_40px_90px_-36px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3 border-b border-[#20004d]/8 bg-[#f7f6fb] px-4 py-2.5">
          <span className="text-[10px] font-bold tracking-[0.18em] text-[#2949E8]">JURE</span>
          <span className="h-3 w-px bg-[#20004d]/15" aria-hidden />
          <span className="truncate text-[12px] font-medium text-[#5c5670]">
            {ui.nav.cases} · {ui.matter}
          </span>
          <span className="ms-auto rounded-full bg-[#2949E8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2949E8]">
            {ui.matterType}
          </span>
        </div>
        <div className="grid lg:grid-cols-[9.5rem_minmax(0,1fr)_16.5rem]">
          <div className="hidden border-e border-[#20004d]/8 bg-[#faf9fb] p-3 lg:block">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b6fd1]">
              {ui.nav.cases}
            </p>
            <div className="rounded-lg bg-[#2949E8]/10 px-2.5 py-2 text-[12px] font-semibold text-[#2949E8]">
              {ui.matter}
            </div>
            <p className="mt-2 px-2 text-[11px] leading-snug text-[#6b6280]">{ui.commercialDispute}</p>
          </div>
          <div className="p-4">
            <MatterBody ui={ui} />
          </div>
          <div className="border-t border-[#20004d]/8 p-4 lg:border-s lg:border-t-0">
            <JuriaSummary ui={ui} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroMatterPreview;

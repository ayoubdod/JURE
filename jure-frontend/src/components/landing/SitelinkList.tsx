import React from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { getSitelinks } from "@/marketing/sitelinks";
import type { MarketingLocale } from "@/marketing/site";
import { track, MarketingEvents } from "@/lib/analytics";

type SitelinkListProps = {
  lang: MarketingLocale;
  label: string;
};

/**
 * Google-style sitelink rows: bold title, one-line snippet, chevron, dividers.
 * Links must stay crawlable (real <a href>) so they can also become SERP sitelinks.
 */
const SitelinkList: React.FC<SitelinkListProps> = ({ lang, label }) => {
  const links = getSitelinks(lang);

  return (
    <nav
      aria-label={label}
      className="overflow-hidden rounded-xl border border-neutral-200/90 bg-white dark:border-white/10 dark:bg-[#1f1f1f]"
    >
      {links.map((link, index) => (
        <Link
          key={link.key}
          to={link.href}
          onClick={() =>
            track(MarketingEvents.SitelinkClick, { key: link.key, source: "home", lang })
          }
          className={`group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04] ${
            index < links.length - 1
              ? "border-b border-neutral-200/80 dark:border-white/10"
              : ""
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-snug text-[#64499D] dark:text-white group-hover:text-[#A58CF4] transition-colors">
              {link.name}
            </div>
            <p className="mt-0.5 truncate text-[13px] leading-snug text-neutral-500 dark:text-[#9aa0a6]">
              {link.description}
            </p>
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-neutral-400 rtl:rotate-180 dark:text-[#9aa0a6]"
            aria-hidden
          />
        </Link>
      ))}
    </nav>
  );
};

export default SitelinkList;

import React from "react";
import { Building2, Languages, Scale, ShieldCheck } from "lucide-react";

type TrustItem = {
  title: string;
  detail: string;
};

const ICONS = [ShieldCheck, Building2, Languages, Scale] as const;

type TrustComplianceStripProps = {
  label: string;
  items: TrustItem[];
};

/** Early-access trust signals shown with the security section. */
const TrustComplianceStrip: React.FC<TrustComplianceStripProps> = ({ label, items }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2949E8]">{label}</p>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = ICONS[index] ?? ShieldCheck;
        return (
          <li
            key={item.title}
            className="flex gap-3 rounded-2xl border border-[#20004d]/10 bg-white px-4 py-4 text-start"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2949E8]/10 text-[#2949E8]">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug text-[#171321]">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#6b6280]">{item.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);

export default TrustComplianceStrip;

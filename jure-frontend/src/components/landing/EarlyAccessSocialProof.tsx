import React from "react";

export type SocialLogo = {
  name: string;
  src?: string;
};

export type SocialQuote = {
  quote: string;
  attribution: string;
};

type EarlyAccessSocialProofProps = {
  label: string;
  emptyNote: string;
  logos?: SocialLogo[];
  quotes?: SocialQuote[];
  className?: string;
};

/**
 * Placeholder for early-access proof. Pass `logos` and/or `quotes`
 * when partner firms or pilot testimonials are ready; otherwise it
 * stays a quiet note instead of fake marks.
 */
const EarlyAccessSocialProof: React.FC<EarlyAccessSocialProofProps> = ({
  label,
  emptyNote,
  logos = [],
  quotes = [],
  className = "",
}) => {
  const hasProof = logos.length > 0 || quotes.length > 0;

  return (
    <aside
      aria-label={label}
      data-component="EarlyAccessSocialProof"
      className={`rounded-2xl border border-[#20004d]/10 bg-white/70 px-4 py-4 text-start sm:px-5 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b6fd1]">{label}</p>

      {hasProof ? (
        <div className="mt-3 space-y-4">
          {logos.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-3">
              {logos.map((logo) => (
                <li
                  key={logo.name}
                  className="flex h-10 min-w-[7.5rem] items-center justify-center rounded-lg border border-[#20004d]/10 bg-[#f7f6fb] px-3"
                >
                  {logo.src ? (
                    <img src={logo.src} alt={logo.name} className="max-h-6 w-auto object-contain" />
                  ) : (
                    <span className="text-xs font-semibold tracking-wide text-[#3c3650]">{logo.name}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {quotes.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {quotes.map((item) => (
                <li key={item.attribution} className="rounded-xl border border-[#20004d]/8 bg-[#f7f6fb] px-3.5 py-3">
                  <blockquote>
                    <p className="text-sm leading-relaxed text-[#171321]">“{item.quote}”</p>
                    <footer className="mt-2 text-xs font-medium text-[#6b6280]">{item.attribution}</footer>
                  </blockquote>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6b6280]">{emptyNote}</p>
      )}
    </aside>
  );
};

export default EarlyAccessSocialProof;

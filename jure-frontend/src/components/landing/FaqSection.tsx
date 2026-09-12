import React, { useRef } from "react";
import { Link } from "react-router";
import { useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqEntry } from "@/marketing/structuredData";

interface FaqSectionProps {
  title: string;
  faqs: FaqEntry[];
  className?: string;
  variant?: "inline" | "panel";
  eyebrow?: string;
  lead?: string;
  ctaPrompt?: string;
  cta?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}

/**
 * Visible FAQ block. Pages that render this should also emit FAQPage JSON-LD
 * with the exact same entries (see faqPageJsonLd) — never the other way round.
 */
const FaqSection: React.FC<FaqSectionProps> = ({
  title,
  faqs,
  className = "",
  variant = "inline",
  lead,
  ctaPrompt,
  cta,
  ctaHref,
  onCtaClick,
}) => {
  const stageRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(stageRef, { once: true, margin: "-80px", amount: 0.18 });

  if (variant === "panel") {
    const entered = Boolean(reduce) || inView;

    return (
      <section
        ref={stageRef}
        id="faq"
        className={`faq-stage${entered ? " faq-stage--in" : ""}${reduce ? " faq-stage--static" : ""}${className ? ` ${className}` : ""}`}
        aria-labelledby="faq-heading"
      >
        <div className="faq-stage__photo" aria-hidden>
          <img src="/images/landing-page/Q&A.jpg" alt="" />
        </div>
        <div className="faq-stage__veil" aria-hidden />
        <div className="faq-shell">
          <div className="faq-shell__intro">
            <h2 id="faq-heading" className="faq-shell__title">
              {title}
            </h2>
            {lead ? <p className="faq-shell__lead">{lead}</p> : null}
          </div>

          <Accordion type="single" collapsible defaultValue="faq-0" className="faq-list">
            {faqs.map((faq, i) => {
              const n = String(i + 1).padStart(2, "0");
              return (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${i}`}
                  className="faq-row"
                  style={{ ["--faq-i" as string]: i }}
                >
                  <AccordionTrigger className="faq-row__trigger hover:no-underline [&>svg]:hidden">
                    <span className="faq-row__label">
                      <span className="faq-row__num" aria-hidden>
                        {n}
                      </span>
                      <span className="faq-row__question">{faq.question}</span>
                    </span>
                    <span className="faq-row__icon" aria-hidden>
                      <Plus className="faq-row__plus" strokeWidth={1.75} />
                      <X className="faq-row__close" strokeWidth={1.75} />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="faq-row__answer">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {cta && ctaHref ? (
            <p className="faq-shell__cta">
              {ctaPrompt ? <span className="faq-shell__cta-prompt">{ctaPrompt}</span> : null}{" "}
              <Link to={ctaHref} className="faq-shell__cta-link" onClick={onCtaClick}>
                {cta}
                <ArrowRight className="faq-shell__cta-arrow" />
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`max-w-3xl mx-auto px-4 sm:px-6 ${className}`}>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 landing-ink">
        {title}
      </h2>
      <Accordion type="single" collapsible className="landing-glass rounded-2xl px-4 sm:px-6">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={faq.question}
            value={`faq-${i}`}
            className="border-[var(--landing-line)] last:border-b-0"
          >
            <AccordionTrigger className="text-start text-sm sm:text-base font-semibold hover:no-underline hover:text-[var(--jure-blue)]">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqSection;

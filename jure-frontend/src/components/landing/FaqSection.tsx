import React from "react";
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
}

/**
 * Visible FAQ block. Pages that render this should also emit FAQPage JSON-LD
 * with the exact same entries (see faqPageJsonLd) — never the other way round.
 */
const FaqSection: React.FC<FaqSectionProps> = ({ title, faqs, className = "" }) => (
  <section className={`max-w-3xl mx-auto px-4 sm:px-6 ${className}`}>
    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-slate-900 dark:text-white">
      {title}
    </h2>
    <Accordion type="single" collapsible className="landing-glass rounded-2xl px-4 sm:px-6">
      {faqs.map((faq, i) => (
        <AccordionItem
          key={faq.question}
          value={`faq-${i}`}
          className="border-[#64499D]/10 dark:border-[#8B6FD1]/15 last:border-b-0"
        >
          <AccordionTrigger className="text-start text-sm sm:text-base font-semibold hover:no-underline hover:text-[#64499D] dark:hover:text-[#CFC2FF]">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>
);

export default FaqSection;

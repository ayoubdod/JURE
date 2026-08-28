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
    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-[#64499D] dark:text-white">
      {title}
    </h2>
    <Accordion type="single" collapsible className="landing-glass rounded-2xl px-4 sm:px-6">
      {faqs.map((faq, i) => (
        <AccordionItem
          key={faq.question}
          value={`faq-${i}`}
          className="border-[#64499D]/10 dark:border-white/10 last:border-b-0"
        >
          <AccordionTrigger className="text-start text-sm sm:text-base font-semibold hover:no-underline hover:text-[#A58CF4]">
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

export default FaqSection;

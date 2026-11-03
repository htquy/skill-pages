"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  badge: string;
  title: string;
  items: FaqItem[];
}

export function FaqSection({ badge, title, items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Structured Data for AEO / Google FAQ Rich Snippet
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
      {/* JSON-LD for Search Engines and AI Answer Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Container>
        <div className="mx-auto max-w-[680px] text-center">
          <div className="eyebrow">{badge}</div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            {title}
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-[680px] space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`overflow-hidden rounded-2xl border transition-all duration-500 ease-fluid ${
                  isOpen
                    ? "border-brand-200 bg-white shadow-lift"
                    : "border-zinc-200 bg-zinc-50 hover:border-brand-200 hover:bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left focus-visible:outline-2 focus-visible:outline-brand-600"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-zinc-900 [text-wrap:pretty]">
                    {item.q}
                  </span>
                  <span
                    className={`inline-grid size-7 shrink-0 place-items-center rounded-full transition-all duration-500 ease-fluid ${
                      isOpen ? "rotate-180 bg-brand-600 text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200"
                    }`}
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </span>
                </button>

                {isOpen && (
                  <div className="animate-fade-up border-t border-brand-100 px-5 pb-5 pt-4 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

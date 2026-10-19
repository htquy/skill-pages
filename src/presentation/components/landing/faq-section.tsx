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
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
            <span>{badge}</span>
          </div>
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
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-zinc-100/70 focus-visible:outline-2 focus-visible:outline-zinc-950"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-zinc-900 [text-wrap:pretty]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-zinc-500 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      isOpen ? "rotate-180 text-zinc-900" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-200/60 bg-white p-5 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">
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

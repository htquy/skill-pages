"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/src/presentation/components/layout/container";

interface TaglineRevealProps {
  lead: string;
  accent: string;
}

export function TaglineReveal({ lead, accent }: TaglineRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set());

  const fullText = `${lead} ${accent}`;
  const words = fullText.split(" ").filter(Boolean);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = container.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Bắt đầu kích hoạt khi phần tử đi vào giữa màn hình
        const triggerPoint = windowHeight * 0.75;
        const exitPoint = windowHeight * 0.25;

        if (rect.top <= triggerPoint && rect.bottom >= exitPoint) {
          const totalDistance = triggerPoint - exitPoint;
          const currentProgress = Math.min(
            Math.max((triggerPoint - rect.top) / totalDistance, 0),
            1,
          );

          const targetCount = Math.floor(currentProgress * words.length);
          setActiveIndices((prev) => {
            const next = new Set<number>();
            for (let i = 0; i <= targetCount; i++) {
              next.add(i);
            }
            return next;
          });
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [words.length]);

  return (
    <section className="border-y border-zinc-200 bg-zinc-50/50 py-24 sm:py-32">
      <Container>
        <div ref={containerRef} className="mx-auto max-w-[680px] text-center">
          <p className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl [text-wrap:balance]">
            {words.map((word, index) => {
              const isActive = activeIndices.has(index);
              return (
                <span
                  key={`${word}-${index}`}
                  className="inline-block transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{
                    color: isActive ? "#09090b" : "#a1a1aa",
                    opacity: isActive ? 1 : 0.35,
                    transform: isActive ? "translateY(0)" : "translateY(3px)",
                    marginRight: "0.28em",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </p>
        </div>
      </Container>
    </section>
  );
}

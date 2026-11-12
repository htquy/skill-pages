"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/src/presentation/components/layout/container";

interface TaglineRevealProps {
  lead: string;
  accent: string;
}

export function TaglineReveal({ lead, accent }: TaglineRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Chỉ lưu SỐ từ đã sáng: state là số nguyên nên React bỏ qua render khi giá trị không đổi
  // (trước đây mỗi khung hình cuộn tạo một Set mới → render lại liên tục trên điện thoại).
  const [activeCount, setActiveCount] = useState(-1);

  const fullText = `${lead} ${accent}`;
  const words = fullText.split(" ").filter(Boolean);
  // Các từ thuộc phần `accent` được tô màu iris khi sáng lên.
  const accentStart = lead.split(" ").filter(Boolean).length;

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
          setActiveCount(targetCount);
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
    <section className="relative overflow-hidden border-y border-zinc-200 py-16 sm:py-32 bg-zinc-50">
      <Container>
        <div ref={containerRef} className="mx-auto max-w-[680px] text-center">
          <p className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl [text-wrap:balance]">
            {words.map((word, index) => {
              const isActive = index <= activeCount;
              return (
                <span
                  key={`${word}-${index}`}
                  className="inline-block transition-[color,opacity,transform] duration-700 ease-fluid"
                  style={{
                    color: isActive
                      ? index >= accentStart
                        ? "var(--color-brand-600)"
                        : "var(--color-zinc-950)"
                      : "var(--color-zinc-400)",
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

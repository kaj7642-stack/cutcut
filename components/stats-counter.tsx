"use client";

import { useState, useEffect, useRef } from "react";

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const ratio = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - ratio, 3);
            setCount(Math.round(eased * target));
            if (ratio < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

export function StatsCounter() {
  const [stats, setStats] = useState({ users: 100, renders: 500, games: 7 });

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const users = useCountUp(stats.users);
  const renders = useCountUp(stats.renders);
  const games = useCountUp(stats.games);

  return (
    <section className="px-6 py-12 fade-section" style={{ background: "var(--bg-card)" }}>
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
        <div ref={users.ref}>
          <div className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--accent)" }}>
            {users.count.toLocaleString()}+
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>가입 유저</div>
        </div>
        <div ref={renders.ref}>
          <div className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--accent)" }}>
            {renders.count.toLocaleString()}+
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>렌더링 완료</div>
        </div>
        <div ref={games.ref}>
          <div className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--accent)" }}>
            {games.count.toLocaleString()}+
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>지원 게임</div>
        </div>
      </div>
    </section>
  );
}

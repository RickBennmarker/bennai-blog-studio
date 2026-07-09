"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChevronLeft, IconClock, IconCalendar, IconDraft } from "./icons";

interface ScheduledItem {
  id: string;
  title: string;
  scheduled_for: string;
}

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** Lokale YYYY-MM-DD sleutel (niet UTC, zodat late-avond-posts op de juiste dag vallen). */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PlanningView({
  scheduled,
  unplanned,
}: {
  scheduled: ScheduledItem[];
  unplanned: { id: string; title: string }[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Groepeer geplande posts per dag.
  const byDay = new Map<string, ScheduledItem[]>();
  for (const item of scheduled) {
    const key = dayKey(new Date(item.scheduled_for));
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(item);
  }

  // Maandraster: begin op maandag.
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // ma=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    const m = month + delta;
    setYear((y) => y + Math.floor(m / 12));
    setMonth(((m % 12) + 12) % 12);
  }

  const todayKey = dayKey(today);
  const upcoming = [...scheduled].sort((a, b) =>
    a.scheduled_for.localeCompare(b.scheduled_for)
  );

  return (
    <div className="reveal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Planning</h1>
          <p className="mt-1 text-sm text-muted">
            Ingeplande posts staan als concept klaar in je CMS en gaan automatisch live
            op hun moment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost !px-2.5" aria-label="Vorige maand">
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-40 text-center font-display font-semibold">
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => shift(1)} className="btn-ghost !px-2.5" aria-label="Volgende maand">
            <IconChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Kalender */}
      <div className="card mt-6 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const key = date ? dayKey(date) : `empty-${i}`;
            const items = date ? (byDay.get(key) ?? []) : [];
            const isToday = date && key === todayKey;
            return (
              <div
                key={key}
                className={`min-h-24 border-b border-r border-border p-1.5 ${
                  i % 7 === 6 ? "border-r-0" : ""
                } ${date ? "" : "bg-surface-2/30"}`}
              >
                {date && (
                  <>
                    <div
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-primary font-semibold text-white" : "text-faint"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          href={`/drafts/${item.id}`}
                          title={item.title}
                          className="block truncate rounded-md bg-accent/15 px-1.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/25"
                        >
                          {new Date(item.scheduled_for).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Aankomend */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconClock className="h-4 w-4 text-accent" /> Aankomend
          </h2>
          {upcoming.length === 0 ? (
            <div className="card mt-3 border-dashed p-6 text-center text-sm text-muted">
              Nog niets ingepland. Open een draft en klik op <strong>Plan</strong>.
            </div>
          ) : (
            <div className="stagger mt-3 space-y-2">
              {upcoming.map((item) => (
                <Link
                  key={item.id}
                  href={`/drafts/${item.id}`}
                  className="card card-lift flex items-center gap-3 p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <span className="text-[10px] uppercase leading-none">
                      {MONTHS[new Date(item.scheduled_for).getMonth()].slice(0, 3)}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {new Date(item.scheduled_for).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-faint">
                      {new Date(item.scheduled_for).toLocaleString("nl-NL", {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Klaar om in te plannen */}
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconDraft className="h-4 w-4 text-primary" /> Klaar om in te plannen
          </h2>
          {unplanned.length === 0 ? (
            <div className="card mt-3 border-dashed p-6 text-center text-sm text-muted">
              Geen concepten. Genereer nieuwe posts vanuit Kansen of Nieuwe post.
            </div>
          ) : (
            <div className="stagger mt-3 space-y-2">
              {unplanned.map((item) => (
                <Link
                  key={item.id}
                  href={`/drafts/${item.id}`}
                  className="card card-lift flex items-center gap-3 p-3.5"
                >
                  <IconCalendar className="h-5 w-5 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    {item.title}
                  </div>
                  <span className="text-xs text-primary">Plan →</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

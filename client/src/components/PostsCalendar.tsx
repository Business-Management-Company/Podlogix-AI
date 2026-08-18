import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/kit";

export interface CalendarEntry {
  date: string; // ISO datetime
  label: string;
  kind: "scheduled" | "proposal";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Month-grid content calendar (the Ausha chassis): live scheduled posts render
 * solid, not-yet-scheduled proposals render amber, today gets a ring.
 */
export function PostsCalendar({ entries }: { entries: CalendarEntry[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const entriesByDay = new Map<number, CalendarEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
    const day = d.getDate();
    if (!entriesByDay.has(day)) entriesByDay.set(day, []);
    entriesByDay.get(day)!.push(entry);
  }

  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const isToday = (day: number) =>
    day === now.getDate() && cursor.month === now.getMonth() && cursor.year === now.getFullYear();

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <Card padding="lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-950">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            onClick={() => shift(-1)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => shift(1)}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-zinc-100 bg-zinc-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-zinc-50 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className="min-h-[64px] bg-white p-1">
            {day && (
              <>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    isToday(day) ? "bg-zinc-950 font-semibold text-white" : "text-zinc-500"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {(entriesByDay.get(day) ?? []).slice(0, 3).map((entry, j) => (
                    <div
                      key={j}
                      title={entry.label}
                      className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight ${
                        entry.kind === "scheduled"
                          ? "bg-zinc-950 text-white"
                          : "border border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {entry.label}
                    </div>
                  ))}
                  {(entriesByDay.get(day)?.length ?? 0) > 3 && (
                    <p className="px-1 text-[9px] text-zinc-400">+{entriesByDay.get(day)!.length - 3} more</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-zinc-950" /> Scheduled
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm border border-amber-300 bg-amber-50" /> Planned (not scheduled yet)
        </span>
      </div>
    </Card>
  );
}

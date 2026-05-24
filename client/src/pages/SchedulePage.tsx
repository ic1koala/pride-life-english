import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Calendar, ChevronRight, CheckCircle2, Lock, BookOpen } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";

const MONTHS = [
  { label: "1ヶ月目", weeks: [1, 2, 3, 4], theme: "基礎固め — Self Introduction & Daily Life" },
  { label: "2ヶ月目", weeks: [5, 6, 7, 8], theme: "表現力UP — Feelings & Opinions" },
  { label: "3ヶ月目", weeks: [9, 10, 11, 12], theme: "会話力 — Conversations & Discussions" },
  { label: "4ヶ月目", weeks: [13, 14, 15, 16], theme: "実践 — Work & Social Situations" },
  { label: "5ヶ月目", weeks: [17, 18, 19, 20], theme: "応用 — Culture & Identity" },
  { label: "6ヶ月目", weeks: [21, 22, 23, 24], theme: "仕上げ — Presentation & Pride" },
];

const RAINBOW = ["#E53935", "#FF6D00", "#FFD600", "#43A047", "#1E88E5", "#8E24AA"];

export default function SchedulePage() {
  const { data: progressSummary, isLoading: loadingProgress } = trpc.progress.summary.useQuery();
  const { data: lessons, isLoading: loadingLessons } = trpc.lessons.list.useQuery();
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  if (loadingProgress || loadingLessons) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 w-full bg-muted rounded-2xl animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 w-full bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const completedLessons = progressSummary?.completed ?? 0;
  const currentWeek = Math.max(1, Math.ceil((completedLessons + 1) / 5));

  const weekInfo = useMemo(() => {
    if (!lessons) return {};
    const map: Record<number, { total: number; completed: number; titles: string[] }> = {};
    for (let w = 1; w <= 24; w++) {
      const wkLessons = lessons.filter((l: any) => l.weekNumber === w);
      const wkCompleted = wkLessons.filter((l: any) => completedLessons >= l.orderIndex).length;
      map[w] = {
        total: wkLessons.length,
        completed: wkCompleted,
        titles: wkLessons.map((l: any) => l.title.replace(/^Week \d+ Day \d+: /, "")),
      };
    }
    return map;
  }, [lessons, completedLessons]);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 sm:px-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={18} className="text-primary" />
          <h1 className="font-serif text-xl font-bold text-foreground">年間スケジュール</h1>
        </div>
        <p className="text-sm text-muted-foreground">6ヶ月間の学習カリキュラム</p>
      </div>

      {/* Progress overview */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">全体進捗</span>
            <span className="text-sm font-bold text-foreground">{Math.round((completedLessons / 120) * 100)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            {MONTHS.map((m, i) => {
              const monthLessons = m.weeks.length * 5;
              const monthCompleted = m.weeks.reduce((sum, w) => sum + (weekInfo[w]?.completed ?? 0), 0);
              const pct = (monthCompleted / monthLessons) * 100;
              return (
                <div key={i} className="flex-1 h-full" style={{ background: `${RAINBOW[i]}${pct > 0 ? "" : "33"}` }}>
                  <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: RAINBOW[i] }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            {MONTHS.map((m, i) => (
              <span key={i} className="text-[9px] text-muted-foreground text-center flex-1">{i + 1}月目</span>
            ))}
          </div>
        </div>
      </div>

      {/* Month cards */}
      <div className="px-4 sm:px-6 space-y-3">
        {MONTHS.map((month, mi) => {
          const monthCompleted = month.weeks.reduce((sum, w) => sum + (weekInfo[w]?.completed ?? 0), 0);
          const monthTotal = month.weeks.length * 5;
          const pct = Math.round((monthCompleted / monthTotal) * 100);
          const isExpanded = expandedMonth === mi;
          const isCurrent = month.weeks.includes(currentWeek);
          const isPast = month.weeks[month.weeks.length - 1] < currentWeek;
          const isFuture = month.weeks[0] > currentWeek;

          return (
            <div key={mi} className="premium-card rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : mi)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-white text-sm"
                  style={{ background: RAINBOW[mi] }}>
                  {isPast ? <CheckCircle2 size={18} /> : mi + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{month.label}</h3>
                    {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">現在</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{month.theme}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold" style={{ color: RAINBOW[mi] }}>{pct}%</span>
                  <ChevronRight size={14} className={cn("text-muted-foreground transition-transform mx-auto mt-0.5", isExpanded && "rotate-90")} />
                </div>
              </button>

              {/* Progress bar */}
              <div className="px-4 pb-3 -mt-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: RAINBOW[mi] }} />
                </div>
              </div>

              {/* Expanded weeks */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                  {month.weeks.map((wk) => {
                    const info = weekInfo[wk];
                    const wkPct = info ? Math.round((info.completed / Math.max(info.total, 1)) * 100) : 0;
                    const wkCurrent = wk === currentWeek;
                    return (
                      <Link key={wk} href={`/dashboard`}>
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          wkCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                        )}>
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                            wkPct === 100 ? "text-white" : wkCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )} style={wkPct === 100 ? { background: RAINBOW[mi] } : undefined}>
                            {wkPct === 100 ? <CheckCircle2 size={14} /> : wk}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">第{wk}週</p>
                            <p className="text-[10px] text-muted-foreground">{info?.completed ?? 0} / {info?.total ?? 5} レッスン</p>
                          </div>
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                            <div className="h-full rounded-full" style={{ width: `${wkPct}%`, background: RAINBOW[mi] }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

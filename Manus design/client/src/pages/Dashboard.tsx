import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Star, Flame, Trophy, Calendar, ChevronRight, ChevronLeft,
  CheckCircle2, Lock, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SO_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuDtnqiMEHoVtf95LpFgDutq2MfKUWAZxzQaNo3tvSerDrMnzrO9LTEp9qgtHQln_L6MPE5mQR5YnqQwYjTZXToqk0b6HT-LuvDz0k3H1fRngI5AUqwhoaEfGaPxHFKVXz_kCkywUzOCBERHSyvXuCMkFIap3sAnKg1OwD0OG4z7CsxERgry4OYGqjK4lfKr-YVjaXah7yXXt8QP4AddACZ-eWCoNDNyfSURvOeYstcGA-o-uScjrS8MgZx9vm9nHmRYIdRyKMIt6cc";
const SLIDE_BG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDPZFyZ09ySrfw7CO6ZjzF_XVw03u52c05zfav0kyEyQ0RRo_s5IsaxgaPtTGxwppEXDkwh4vS_0efAT8Hgre_1C4kBjoo_UQmxvC6a6oIfqrnnEOZwYX40iXcwVXaUAdVOkfBN1RxxKediUzNLXFdZPYGOjm08iRbq-hzllsnCAVG182IGsifoHtSQEv00a-XV52CHAoW6rgTZKjP1silVz2iFTcSWlu0BOFAhH4q1lohks-5MtilhBEio5SoJI0HZgJPIHwgl-E0";
const TOTAL_WEEKS = 24;
const DAY_LABELS = ["日","月","火","水","木","金","土"];

export default function Dashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: progressSummary, isLoading: loadingProgress } = trpc.progress.summary.useQuery();
  const { data: lessons, isLoading: loadingLessons } = trpc.lessons.list.useQuery();
  const { data: bonusHistory } = trpc.loginBonus.history.useQuery();
  const { data: bonusResult } = trpc.loginBonus.totalPoints.useQuery();

  const claimBonus = trpc.loginBonus.claim.useMutation({
    onSuccess: (data) => {
      if (data.alreadyClaimed) {
        // silent
      } else {
        toast.success(`${data.streak}日連続ログイン！ +${data.pointsEarned} ポイント獲得！`, { duration: 4000 });
      }
      utils.loginBonus.history.invalidate();
      utils.loginBonus.totalPoints.invalidate();
      utils.progress.summary.invalidate();
    },
  });

  useEffect(() => { claimBonus.mutate(); }, []);

  const seedLessons = trpc.admin.seedLessons.useMutation({
    onSuccess: () => { toast.success("レッスンを作成しました！"); utils.lessons.list.invalidate(); },
  });

  const totalLessons = progressSummary?.totalLessons ?? 120;
  const completedLessons = progressSummary?.completed ?? 0;
  const progressPct = Math.round((completedLessons / totalLessons) * 100);
  const totalPoints = progressSummary?.totalPoints ?? 0;
  const milestones = progressSummary?.milestones ?? [];
  const currentWeek = Math.max(1, Math.ceil((completedLessons + 1) / 5));
  const streak = bonusHistory?.[0]?.streakDay ?? 0;

  const [viewWeek, setViewWeek] = useState(currentWeek);
  const { data: weekLessons } = trpc.lessons.byWeek.useQuery({ week: viewWeek });

  // Login bonus — last 7 days
  const bonusDays = useMemo(() => {
    const days = [];
    const today = new Date();
    const loggedDays = new Set(bonusHistory?.map((b) => b.loginDate) ?? []);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        dayLabel: DAY_LABELS[d.getDay()],
        dateNum: d.getDate(),
        claimed: loggedDays.has(dateStr),
        isToday: i === 0,
      });
    }
    return days;
  }, [bonusHistory]);

  return (
    <div className="pb-6">
      {/* ─── Hero Banner ─── */}
      <div className="relative overflow-hidden">
        <img src={SLIDE_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="relative z-10 px-5 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
          <div className="flex items-center gap-3 mb-5">
            <img src={SO_LOGO} alt="SO ENGLISH!" className="w-11 h-11 rounded-xl shadow-lg" />
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-bold text-white leading-tight">
                おかえりなさい、{user?.name?.split(" ")[0] ?? "メンバー"}さん
              </h1>
              <p className="text-white/70 text-xs mt-0.5">
                {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90 text-xs font-medium">6ヶ月コース進捗</span>
              <span className="text-white font-bold text-sm">{progressPct}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full pride-gradient rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/60">
              <span>{completedLessons} / {totalLessons} レッスン</span>
              <span>Week {currentWeek} / {TOTAL_WEEKS}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-3 relative z-10 space-y-4">
        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "完了", value: completedLessons, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "ポイント", value: totalPoints, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "バッジ", value: milestones.length, icon: Trophy, color: "text-violet-600", bg: "bg-violet-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="premium-card rounded-2xl p-3.5 text-center">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", bg)}>
                <Icon size={16} className={color} />
              </div>
              <div className="text-lg font-bold text-foreground">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* ─── Login Bonus Calendar ─── */}
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                <Flame size={14} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">ログインボーナス</h3>
                <p className="text-[10px] text-muted-foreground">{streak}日連続</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-full">
              <Star size={12} className="text-primary" />
              <span className="text-xs font-bold text-primary">{totalPoints} pt</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {bonusDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground mb-1">{day.dayLabel}</span>
                <div className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all",
                  day.claimed
                    ? "pride-gradient text-white shadow-sm"
                    : day.isToday
                      ? "border-2 border-primary bg-primary/5 text-primary"
                      : "bg-muted/50 text-muted-foreground"
                )}>
                  {day.claimed ? <CheckCircle2 size={16} /> : day.dateNum}
                </div>
              </div>
            ))}
          </div>

          {streak >= 3 && (
            <div className="mt-3 p-2.5 rounded-xl bg-orange-50 text-xs text-orange-700 text-center">
              <Flame size={12} className="inline mr-1" />
              {streak}日連続ログイン中！{streak >= 7 ? "50pt/日" : "20pt/日"}獲得中
            </div>
          )}
        </div>

        {/* ─── Today's Lesson CTA ─── */}
        {weekLessons && weekLessons.length > 0 && (() => {
          const completedSet = new Set<number>();
          // Find next uncompleted lesson
          const nextLesson = weekLessons.find((l) => {
            const done = (progressSummary?.completed ?? 0) >= l.orderIndex;
            if (done) completedSet.add(l.id);
            return !done;
          }) || weekLessons[0];
          if (!nextLesson) return null;
          return (
            <Link href={`/lessons/${nextLesson.id}`}>
              <div className="premium-card rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div className="pride-gradient-soft p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Play size={14} className="text-primary" />
                    <span className="text-xs font-bold text-primary">今日のレッスン</span>
                  </div>
                  <div className="bg-card rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">
                          Week {nextLesson.weekNumber} · Day {nextLesson.dayNumber}
                        </p>
                        <p className="font-semibold text-foreground text-sm mt-0.5 truncate">
                          {nextLesson.title.replace(/^Week \d+ Day \d+: /, "")}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl pride-gradient flex items-center justify-center shrink-0 ml-3">
                        <Play size={18} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })()}

        {/* ─── Weekly Lessons ─── */}
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Week {viewWeek} のレッスン</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewWeek(Math.max(1, viewWeek - 1))} disabled={viewWeek <= 1}
                className="p-1 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[11px] text-muted-foreground w-14 text-center">{viewWeek} / {TOTAL_WEEKS}</span>
              <button onClick={() => setViewWeek(Math.min(TOTAL_WEEKS, viewWeek + 1))} disabled={viewWeek >= TOTAL_WEEKS}
                className="p-1 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {loadingLessons ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : !weekLessons?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Lock size={20} className="mx-auto mb-2 opacity-40" />
              <p>このWeekのレッスンはまだ公開されていません</p>
              {(user as any)?.role === "admin" && !lessons?.length && (
                <Button size="sm" className="mt-3" onClick={() => seedLessons.mutate()} disabled={seedLessons.isPending}>
                  レッスンを作成
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {weekLessons.map((lesson) => {
                const done = (progressSummary?.completed ?? 0) >= lesson.orderIndex;
                const isCurrent = (progressSummary?.completed ?? 0) === lesson.orderIndex - 1;
                return (
                  <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98]",
                      done ? "bg-emerald-50/80" : isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                    )}>
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                        done ? "bg-emerald-500 text-white" : isCurrent ? "pride-gradient text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {done ? <CheckCircle2 size={16} /> : `D${lesson.dayNumber}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lesson.title.replace(/^Week \d+ Day \d+: /, "")}
                        </p>
                        {isCurrent && <span className="text-[10px] text-primary font-medium">← 次のレッスン</span>}
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Course Archive Grid ─── */}
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">講座アーカイブ</h3>
            </div>
            <Link href="/progress">
              <span className="text-[11px] text-primary font-medium cursor-pointer hover:underline flex items-center gap-0.5">
                詳細 <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
              const wk = i + 1;
              const wkDone = Math.floor(completedLessons / 5) >= wk;
              const wkCurrent = currentWeek === wk;
              return (
                <button key={wk} onClick={() => setViewWeek(wk)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-medium transition-all active:scale-95",
                    viewWeek === wk ? "ring-2 ring-primary ring-offset-1" : "",
                    wkDone ? "pride-gradient text-white" : wkCurrent ? "border-2 border-primary text-primary bg-primary/5" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}>
                  {wkDone && <CheckCircle2 size={10} className="mb-0.5" />}
                  <span className="font-bold text-[11px]">{wk}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Milestones ─── */}
        {milestones.length > 0 && (
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">獲得バッジ</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                  <Trophy size={12} className="text-primary" />
                  <span className="text-xs font-medium text-foreground">{m.badgeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

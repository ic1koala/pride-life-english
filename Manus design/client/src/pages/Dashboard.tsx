import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Star, Flame, Trophy, Calendar, ChevronRight, ChevronLeft,
  CheckCircle2, Lock, Play, Loader2, Sparkles,
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

  const { data: profileData } = trpc.auth.profile.useQuery();
  const buyFreeze = trpc.streak.buyFreeze.useMutation({
    onSuccess: (data) => {
      toast.success("ストリークフリーズを購入しました！❄️");
      utils.auth.profile.invalidate();
      utils.loginBonus.totalPoints.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "購入に失敗しました");
    }
  });

  const seedLessons = trpc.admin.seedLessons.useMutation({
    onSuccess: () => { toast.success("レッスンを作成しました！"); utils.lessons.list.invalidate(); },
  });

  const totalLessons = progressSummary?.totalLessons ?? 96;
  const completedLessons = progressSummary?.completed ?? 0;
  const progressPct = Math.round((completedLessons / totalLessons) * 100);
  const totalPoints = progressSummary?.totalPoints ?? 0;
  const milestones = progressSummary?.milestones ?? [];
  const currentWeek = Math.max(1, Math.min(TOTAL_WEEKS, Math.ceil((completedLessons + 1) / 4)));
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
      <div className="relative overflow-hidden rounded-b-[2rem] shadow-xl">
        <img src={SLIDE_BG} alt="" className="absolute inset-0 w-full h-full object-cover filter brightness-[0.85]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900/90" />
        <div className="relative z-10 px-5 pt-7 pb-8 sm:px-8 sm:pt-9 sm:pb-9">
          
          {/* Welcome Info Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <img src={SO_LOGO} alt="Pride Life English" className="w-11 h-11 rounded-xl shadow-lg border border-white/20" />
              <div>
                <h1 className="font-sans text-sm sm:text-base font-semibold text-white/95 leading-tight flex items-center gap-1">
                  おかえりなさい、<span className="text-pink-300 font-bold">{user?.name?.split(" ")[0] ?? "メンバー"}</span>さん
                </h1>
                <p className="text-white/60 text-[10px] mt-0.5 tracking-wide">
                  {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
                <Sparkles size={12} className="text-amber-300 animate-spin-slow" />
                <span className="text-xs font-bold text-white tracking-wide">Pride Life English</span>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border",
                (profileData?.activeCourse ?? "star") === "star"
                  ? "bg-amber-500/20 text-amber-200 border-amber-400/30"
                  : "bg-sky-500/20 text-sky-200 border-sky-400/30"
              )}>
                {(profileData?.activeCourse ?? "star") === "star" ? "☆コース" : "Knowledge"}
              </div>
            </div>
          </div>

          {/* 1. Brand Signboard Component (看板ロゴ風のコンポーネント) */}
          <div className="mb-6 rounded-2xl relative overflow-hidden pride-gradient p-[1px] shadow-2xl animate-fade-in border border-white/5">
            <div className="bg-black/65 backdrop-blur-md rounded-[15px] px-6 py-7 text-center relative z-10">
              <span className="text-[10px] font-extrabold tracking-[0.3em] text-pink-300 uppercase block mb-1.5">
                ONLINE ENGLISH ACADEMY
              </span>
              <h2 className="text-4xl sm:text-7xl font-black tracking-tight text-white select-none">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 drop-shadow-[0_4px_24px_rgba(236,72,153,0.45)] font-serif italic py-1">
                  Pride Life English
                </span>
              </h2>
              <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto my-3.5" />
              <p className="text-white/80 text-[11px] font-medium tracking-wide">
                自分らしさを誇れる英語力を手に入れよう
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/95 text-xs font-medium">6ヶ月コース全体進捗</span>
              <span className="text-white font-black text-sm">{progressPct}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full pride-gradient rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/70">
              <span>{completedLessons} / {totalLessons} レッスン</span>
              <span className="font-semibold">Week {currentWeek} / {TOTAL_WEEKS}</span>
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

          {/* Streak Freeze Purchase Section */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                <span className="text-xs font-bold text-sky-500">❄️</span>
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">ストリークフリーズ</span>
                <span className="text-[10px] text-muted-foreground block">
                  現在: <strong className="text-sky-600 font-bold">{profileData?.streakFreezesActive ?? 0}個</strong> 所有中
                </span>
              </div>
            </div>
            <Button
              onClick={() => buyFreeze.mutate()}
              disabled={buyFreeze.isPending || (totalPoints ?? 0) < 500}
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1.5 font-bold border-sky-200 text-sky-700 hover:bg-sky-50 active:scale-95 transition-all"
            >
              {buyFreeze.isPending ? <Loader2 size={12} className="animate-spin" /> : "❄️"}
              購入 (500 pt)
            </Button>
          </div>
        </div>

        {/* ─── Today's Lesson CTA ─── */}
        {weekLessons && weekLessons.length > 0 && (() => {
          const completedSet = new Set<number>();
          const allWeekLessonsCompleted = weekLessons.every((l) => (progressSummary?.completed ?? 0) >= l.orderIndex);
          // Find next uncompleted lesson, or default to the first week lesson for review
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
                    <span className="text-xs font-bold text-primary">
                      {allWeekLessonsCompleted ? "今週の復習をしよう！" : "今日のレッスン"}
                    </span>
                  </div>
                  <div className="bg-card rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">
                          Week {nextLesson.weekNumber} · Day {nextLesson.dayNumber}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          {allWeekLessonsCompleted ? "今週のレッスンをすべて完了しました！🎉" : nextLesson.title.replace(/^Week \d+ Day \d+: /, "")}
                        </h4>
                        {allWeekLessonsCompleted && (
                          <p className="text-xs text-muted-foreground mt-1 font-medium text-primary">
                            今週の復習をしよう！毎日ログインして英語の習慣を維持しましょう。
                          </p>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-full pride-gradient flex items-center justify-center text-white shadow-sm flex-shrink-0 animate-pulse">
                        <Play size={16} className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })()}

        {/* 2. YouTube-style Drama Thumbnail Carousel List (レッスン一覧のカルーセル化) */}
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Week {viewWeek} のレッスン</h3>
            </div>
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 border border-border/50">
              <button onClick={() => setViewWeek(Math.max(1, viewWeek - 1))} disabled={viewWeek <= 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronLeft size={13} />
              </button>
              <span className="text-[10px] font-bold text-muted-foreground w-16 text-center">{viewWeek} / {TOTAL_WEEKS}</span>
              <button onClick={() => setViewWeek(Math.min(TOTAL_WEEKS, viewWeek + 1))} disabled={viewWeek >= TOTAL_WEEKS}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {loadingLessons ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[260px] w-[260px] space-y-2">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
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
            <div className="flex overflow-x-auto gap-4 pb-4 pt-1 px-1 scrollbar-none snap-x" style={{ scrollbarWidth: "none" }}>
              {weekLessons.map((lesson) => {
                const done = (progressSummary?.completed ?? 0) >= lesson.orderIndex;
                const isCurrent = (progressSummary?.completed ?? 0) === lesson.orderIndex - 1;
                const progressPct = done ? 100 : isCurrent ? 25 : 0;
                
                // YouTube-style dramatic thumbnails
                const DRAMA_THUMBS = [
                  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop", // study
                  "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop", // movie
                  "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=400&auto=format&fit=crop", // meeting
                  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=400&auto=format&fit=crop", // cafe drama
                ];
                const thumbnail = DRAMA_THUMBS[(lesson.dayNumber - 1) % DRAMA_THUMBS.length];

                return (
                  <Link key={lesson.id} href={`/lessons/${lesson.id}`}>
                    <div className={cn(
                      "min-w-[260px] w-[260px] sm:min-w-[290px] sm:w-[290px] snap-start flex flex-col premium-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl active:scale-[0.98] border border-border group relative",
                      isCurrent && "ring-2 ring-primary/45 ring-offset-1"
                    )}>
                      {/* aspect-video Image Thumbnail */}
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        <img src={thumbnail} alt={lesson.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        
                        {/* Day label */}
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/75 text-white font-extrabold text-[10px] tracking-wider backdrop-blur-sm">
                          Day {lesson.dayNumber}
                        </div>

                        {/* Complete mark (完了マーク チェックアイコン) */}
                        {done && (
                          <div className="absolute inset-0 bg-emerald-950/45 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-white animate-bounce-short">
                              <CheckCircle2 size={22} className="text-white" />
                            </div>
                          </div>
                        )}

                        {/* Current lesson indicator overlay */}
                        {isCurrent && !done && (
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <div className="w-11 h-11 rounded-full pride-gradient flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-110 transition-transform">
                              <Play size={18} className="text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content details & dynamic progress indicators */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground font-semibold">
                              Week {lesson.weekNumber} · Day {lesson.dayNumber}
                            </p>
                            {isCurrent && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">NEXT</span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-foreground mt-1 line-clamp-1 group-hover:text-primary transition-colors">
                            {lesson.title.replace(/^Week \d+ Day \d+: /, "")}
                          </h4>
                        </div>

                        {/* 2b. Progress display & Linear progress bar */}
                        <div className="mt-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={cn(done ? "text-emerald-600" : isCurrent ? "text-primary" : "text-muted-foreground")}>
                              {done ? "Completed" : isCurrent ? "25% Done!" : "0% Done!"}
                            </span>
                            <span className="text-muted-foreground/80">{progressPct}% Completed</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className={cn(
                              "h-full rounded-full transition-all duration-500",
                              done ? "bg-emerald-500" : "pride-gradient"
                            )} style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>
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
              const wkDone = Math.floor(completedLessons / 4) >= wk;
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

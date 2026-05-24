import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CheckCircle2, Lock, Trophy, Star, Flame, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MILESTONE_DEFS = [
  { count: 1, emoji: "🌈", label: "First Step", desc: "Completed your first lesson!" },
  { count: 5, emoji: "⭐", label: "Rising Star", desc: "5 lessons done!" },
  { count: 10, emoji: "🔥", label: "On Fire", desc: "10 lessons completed!" },
  { count: 25, emoji: "💜", label: "Quarter Pride", desc: "25% of the course done!" },
  { count: 50, emoji: "🏳️‍🌈", label: "Halfway Hero", desc: "Halfway through the course!" },
  { count: 75, emoji: "✨", label: "Almost There", desc: "75 lessons completed!" },
  { count: 100, emoji: "💎", label: "Century Club", desc: "100 lessons done!" },
  { count: 120, emoji: "🎓", label: "Pride Graduate", desc: "Course complete!" },
];

export default function ProgressPage() {
  const { data: summary, isLoading } = trpc.progress.summary.useQuery();
  const { data: lessons } = trpc.lessons.list.useQuery();
  const { data: bonusHistory } = trpc.loginBonus.history.useQuery();

  const completed = summary?.completed ?? 0;
  const total = summary?.totalLessons ?? 120;
  const pct = Math.round((completed / total) * 100);
  const earnedMilestones = new Set(summary?.milestones?.map((m) => m.badgeType) ?? []);
  const streak = bonusHistory?.[0]?.streakDay ?? 0;
  const totalPoints = summary?.totalPoints ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          Your <span className="pride-gradient-text">Progress</span>
        </h1>
        <p className="text-muted-foreground mt-1">Track your 6-month English journey</p>
      </div>

      <div className="h-1 rounded-full pride-gradient" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Lessons Done", value: completed, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Points", value: totalPoints, icon: Star, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Day Streak", value: streak, icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Badges Earned", value: earnedMilestones.size, icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="premium-card rounded-2xl p-5">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", bg)}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" /> 6-Month Course
          </h2>
          <span className="text-2xl font-bold pride-gradient-text">{pct}%</span>
        </div>

        <div className="relative h-6 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 pride-gradient rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
            style={{ width: `${Math.max(pct, 2)}%` }}
          >
            {pct > 5 && <span className="text-white text-xs font-bold">{pct}%</span>}
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Week 1</span>
          <span>Month 2</span>
          <span>Month 4</span>
          <span>Month 6 🎓</span>
        </div>

        <p className="text-sm text-muted-foreground mt-3">
          <strong className="text-foreground">{completed}</strong> of <strong className="text-foreground">{total}</strong> lessons completed
          {total - completed > 0 && <> · <strong className="text-foreground">{total - completed}</strong> remaining</>}
        </p>
      </div>

      {/* Milestone badges */}
      <div className="premium-card rounded-2xl p-6">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> Milestone Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MILESTONE_DEFS.map(({ count, emoji, label, desc }) => {
            const earned = completed >= count;
            const milestoneKey = {
              1: "first_lesson", 5: "five_lessons", 10: "ten_lessons", 25: "quarter_done",
              50: "halfway", 75: "three_quarters", 100: "century", 120: "course_complete"
            }[count];
            const isEarned = earnedMilestones.has(milestoneKey ?? "");
            return (
              <div
                key={count}
                className={cn(
                  "rounded-2xl p-4 text-center transition-all",
                  isEarned
                    ? "pride-gradient-subtle border border-primary/20 shadow-sm"
                    : "bg-muted/50 border border-border opacity-50"
                )}
              >
                <div className={cn("text-3xl mb-2", !isEarned && "grayscale")}>{emoji}</div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                <p className="text-xs font-medium mt-2 text-primary">{count} lessons</p>
                {isEarned && (
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full pride-gradient text-white font-medium">Earned!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson grid — all 120 */}
      <div className="premium-card rounded-2xl p-6">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-5">All Lessons</h2>
        {isLoading ? (
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 120 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-15 gap-1.5">
            {Array.from({ length: 120 }, (_, i) => {
              const lessonNum = i + 1;
              const lesson = lessons?.find((l) => l.orderIndex === lessonNum);
              const isDone = lessonNum <= completed;
              const isCurrent = lessonNum === completed + 1;
              return (
                <Link key={lessonNum} href={lesson ? `/lessons/${lesson.id}` : "#"}>
                  <div
                    title={lesson?.title ?? `Lesson ${lessonNum}`}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs font-semibold cursor-pointer transition-all hover:scale-110",
                      isDone
                        ? "pride-gradient text-white shadow-sm"
                        : isCurrent
                        ? "border-2 border-primary text-primary bg-primary/5"
                        : "bg-muted text-muted-foreground/50"
                    )}
                  >
                    {isDone ? "✓" : lessonNum}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Each square = 1 lesson · Rainbow = completed · Outlined = current
        </p>
      </div>

      {/* Login bonus chart */}
      {bonusHistory && bonusHistory.length > 0 && (
        <div className="premium-card rounded-2xl p-6">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
            <Flame size={20} className="text-orange-500" /> Login Bonus History
          </h2>
          <div className="flex flex-wrap gap-2">
            {bonusHistory.slice(0, 30).reverse().map((b) => (
              <div
                key={b.id}
                title={`${b.loginDate} — Day ${b.streakDay} streak · +${b.pointsEarned} pts`}
                className="w-10 h-10 rounded-xl pride-gradient flex items-center justify-center text-white text-xs font-bold shadow-sm"
              >
                {b.streakDay}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Each badge shows your streak day. Keep logging in daily for bigger bonuses!
          </p>
        </div>
      )}
    </div>
  );
}

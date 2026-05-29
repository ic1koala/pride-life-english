import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play, Pause, CheckCircle2, Loader2,
  BookOpen, ChevronLeft, ChevronRight, Star,
  SkipBack, SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

/* ── Skill category icons matching the textbook ── */
const SKILL_ICONS = [
  { symbol: "□", label: "知識", key: "knowledge" },
  { symbol: "◇", label: "L&R", key: "lr" },
  { symbol: "○", label: "Idea", key: "idea" },
  { symbol: "☆", label: "Master", key: "master" },
];

/* ── 3. Custom Audio Player Implementation (カスタム音声プレイヤーの新規実装) ── */
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const skip = (sec: number) => {
    const a = audioRef.current;
    if (a) {
      a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + sec));
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (a) {
      a.currentTime = parseFloat(e.target.value);
      setCurrentTime(a.currentTime);
    }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-muted/40 backdrop-blur-md rounded-2xl p-4 border border-border/80 shadow-inner">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex flex-col sm:flex-row items-center gap-4">
        
        {/* Playback Control Row */}
        <div className="flex items-center gap-3">
          {/* Skip back 5 seconds */}
          <button
            onClick={() => skip(-5)}
            className="w-10 h-10 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center transition-all duration-200 active:scale-90"
            title="5秒戻る"
          >
            <SkipBack size={15} className="text-muted-foreground mr-0.5" />
            <span className="text-[9px] font-extrabold text-muted-foreground">5s</span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-full pride-gradient flex items-center justify-center shadow-md hover:brightness-105 active:scale-95 transition-all duration-200"
          >
            {playing ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
          </button>

          {/* Skip forward 5 seconds */}
          <button
            onClick={() => skip(5)}
            className="w-10 h-10 rounded-full bg-card hover:bg-muted border border-border flex items-center justify-center transition-all duration-200 active:scale-90"
            title="5秒進む"
          >
            <span className="text-[9px] font-extrabold text-muted-foreground mr-0.5">5s</span>
            <SkipForward size={15} className="text-muted-foreground" />
          </button>
        </div>

        {/* Progress seekbar & timeline */}
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-muted-foreground min-w-[32px] text-right">
            {fmt(currentTime)}
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={seek}
              className="w-full h-1.5 rounded-full appearance-none bg-muted hover:bg-muted/80 cursor-pointer accent-primary transition-colors"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--muted)) ${(currentTime / (duration || 1)) * 100}%)`
              }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-muted-foreground min-w-[32px]">
            {fmt(duration)}
          </span>
        </div>

      </div>
    </div>
  );
}

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lessonId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: lesson, isLoading } = trpc.lessons.byId.useQuery({ id: lessonId });
  const { data: myProgress } = trpc.progress.lessonProgress.useQuery({ lessonId });
  const { data: taskProgress, refetch: refetchTasks } = trpc.lessons.taskProgress.useQuery({ lessonId });

  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [wpm, setWpm] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (myProgress?.journalEntry) setJournalText(myProgress.journalEntry ?? "");
    if (myProgress?.speakingFeedback) setFeedback(myProgress.speakingFeedback ?? "");
  }, [myProgress]);

  const toggleTaskMutation = trpc.lessons.toggleTask.useMutation({
    onSuccess: () => {
      utils.progress.summary.invalidate();
      refetchTasks();
    },
    onError: (err) => {
      toast.error("タスクの更新に失敗しました: " + err.message);
    }
  });

  const isTaskCompleted = (key: string) => {
    return taskProgress?.some(p => p.taskKey === key) ?? false;
  };

  const handleToggleTask = async (key: string, points: number) => {
    const currentStatus = isTaskCompleted(key);
    try {
      await toggleTaskMutation.mutateAsync({
        lessonId,
        taskKey: key,
        points,
        completed: !currentStatus
      });
      if (!currentStatus) {
        toast.success(`${points}ポイント獲得しました！ 🎉`);
      } else {
        toast.info(`${points}ポイントが引かれました`);
      }
    } catch (e) {
      // Handled by mutation onError
    }
  };

  const saveJournal = trpc.progress.saveJournal.useMutation({
    onSuccess: async () => {
      setJournalSaved(true);
      toast.success("ジャーナルを保存しました");
      
      // Auto-complete the journal task (60 points) if not completed yet
      if (!isTaskCompleted("journal")) {
        await handleToggleTask("journal", 60);
      }
      
      setTimeout(() => setJournalSaved(false), 3000);
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const completeLesson = trpc.progress.completeLesson.useMutation({
    onSuccess: (data) => {
      toast.success(`レッスン完了！ 合計: ${data.completed} レッスン`);
      utils.progress.summary.invalidate();
      utils.progress.lessonProgress.invalidate({ lessonId });
    },
    onError: () => toast.error("完了処理に失敗しました"),
  });

  if (isLoading) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">レッスンが見つかりません</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>ダッシュボードに戻る</Button>
      </div>
    );
  }

  const isCompleted = !!myProgress?.completedAt;

  // 9 Daily Lesson Tasks Definition
  const LESSON_TASKS = [
    { key: "word", label: "単語練習", points: 40, skills: "◇ L&R / ○ Idea / ☆ Master" },
    { key: "video", label: "動画を見る", points: 20, skills: "□ 知識 / ◇ L&R / ○ Idea / ☆ Master" },
    { key: "journal", label: "ジャーナリング", points: 60, skills: "○ Idea / ☆ Master" },
    { key: "copying", label: "添削音読筆写", points: 80, skills: "◇ L&R / ○ Idea / ☆ Master" },
    { key: "reading", label: "なりきり音読", points: 80, skills: "◇ L&R / ○ Idea / ☆ Master" },
    { key: "read_lookup", label: "Read & Look up", points: 80, skills: "◇ L&R / ○ Idea / ☆ Master" },
    { key: "recitation", label: "スラスラ暗唱", points: 80, skills: "☆ Master" },
    { key: "reading_jp", label: "なりきり音読日本語", points: 40, skills: "◇ L&R" },
    { key: "reading_en", label: "なりきり音読英語", points: 40, skills: "◇ L&R" },
  ];

  const completedCount = taskProgress?.length ?? 0;
  const totalTasks = LESSON_TASKS.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  return (
    <div className="pb-6">
      {/* ─── Header ─── */}
      <div className="px-4 pt-4 pb-3 sm:px-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft size={16} /> ダッシュボード
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full pride-gradient text-white font-semibold">
                Week {lesson.weekNumber} · Day {lesson.dayNumber}
              </span>
              {isCompleted && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={10} /> レッスン完了済み
                </span>
              )}
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {lesson.title.replace(/^Week \d+ Day \d+: /, "")}
            </h1>
          </div>
        </div>

        {/* Skill category legend (matching textbook) */}
        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
          {SKILL_ICONS.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="text-foreground">{s.symbol}</span> {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* ─── Daily Tasks Checklist Card (Duolingo Style Roadmap) ─── */}
        <div className="premium-card rounded-2xl p-5 border border-border shadow-sm bg-card">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                ⚡ 本日のタスクロードマップ
              </h3>
              <p className="text-[11px] text-muted-foreground">
                各タスクを完了してポイントを貯めましょう！(最大 520 pt)
              </p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {completedCount} / {totalTasks} 完了
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
            <div
              className="pride-gradient h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {LESSON_TASKS.map((task) => {
              const done = isTaskCompleted(task.key);
              return (
                <button
                  key={task.key}
                  onClick={() => handleToggleTask(task.key, task.points)}
                  disabled={toggleTaskMutation.isPending}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 hover:border-primary/40",
                    done
                      ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm"
                      : "bg-background border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {done && <CheckCircle2 size={12} className="stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">
                        {task.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                        {task.skills}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      done
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    +{task.points} pt
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Section 1: 動画を見る (Watch Video) ─── */}
        <div className="premium-card rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
          <div className="p-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">□ ◇ ○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">講義動画を見る</h3>
            </div>
            {isTaskCompleted("video") && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> 完了 (+20pt)
              </span>
            )}
          </div>

          {/* Video player */}
          <div className="mx-4 mb-3 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            {lesson.videoUrl ? (
              <video src={lesson.videoUrl} controls className="w-full h-full" />
            ) : (
              <div className="text-center text-white/60 p-6">
                <Play size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">動画は準備中です</p>
              </div>
            )}
          </div>

          {/* Custom Audio player (if videoUrl exists) */}
          {lesson.videoUrl && (
            <div className="px-4 pb-4">
              <AudioPlayer src={lesson.videoUrl} />
            </div>
          )}

          {/* Note section */}
          <div className="px-4 pb-4">
            <div className="border border-dashed border-border rounded-xl p-3 bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center mb-2">〜 Note 〜</p>
              <Textarea placeholder="講義のメモを入力..." className="min-h-20 border-0 bg-transparent text-sm resize-none p-0 focus-visible:ring-0" />
            </div>
          </div>
        </div>

        {/* ─── Section 2: 単語練習 (Word Practice) ─── */}
        <div className="premium-card rounded-2xl p-4 bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">◇ ○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">単語練習 (Quizlet)</h3>
            </div>
            {isTaskCompleted("word") && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> 完了 (+40pt)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-4 leading-relaxed">
            本日のレッスンに出てくる重要単語・表現を練習しましょう。DuolingoやQuizletなどの単語ツールを活用して、スラスラ読めるようになるまで定着させます。
          </p>
          <Button
            variant="outline"
            className="w-full rounded-xl text-xs h-9 font-bold"
            onClick={() => window.open("https://quizlet.com", "_blank")}
          >
            <BookOpen size={14} className="mr-1.5" /> Quizlet で単語練習を開く
          </Button>
        </div>

        {/* ─── Section 3: ジャーナリング (Journaling) ─── */}
        <div className="premium-card rounded-2xl p-5 border border-border shadow-sm bg-card">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">ジャーナリング (書く練習)</h3>
            </div>
            {isTaskCompleted("journal") && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> 完了 (+60pt)
              </span>
            )}
          </div>
          
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Today's Prompt:</p>
            <p className="text-sm text-foreground italic font-medium leading-relaxed">
              {lesson.journalingPrompt || "How would you describe your ideal day?"}
            </p>
          </div>

          <Textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="英語で自由に書いてみましょう。保存するとジャーナリングタスクが自動的に完了になります..."
            className="min-h-36 rounded-xl border-border resize-none text-sm focus-visible:ring-primary"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground font-medium">{journalText.length} 文字</span>
            <Button size="sm"
              onClick={() => saveJournal.mutate({ lessonId, journalEntry: journalText })}
              disabled={saveJournal.isPending || !journalText.trim()}
              className={cn("rounded-xl text-xs h-8 px-4 font-bold transition-all", journalSaved ? "bg-emerald-500 text-white" : "pride-gradient border-0 text-white")}>
              {saveJournal.isPending ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
              {journalSaved ? "保存済み" : "保存する"}
            </Button>
          </div>
        </div>

        {/* ─── Section 4: 音読・暗唱セクション (Oral Practice) ─── */}
        <div className="premium-card rounded-2xl p-5 border border-border shadow-sm bg-card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">◇ ○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">音読・暗唱トレーニング</h3>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            英文を見ながら、または見ずに繰り返し音読し、口を英語に馴染ませます。WPM（分速読単語数）や正解率を計測して進捗を記録しましょう。
          </p>

          <div className="space-y-3.5">
            {/* WPM & Accuracy Inputs */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">初見WPM</span>
                <Input type="number" value={wpm} onChange={(e) => setWpm(e.target.value)}
                  placeholder="—" className="h-8 text-center text-sm w-16 bg-background rounded-lg border-border" />
                <span className="text-xs text-muted-foreground font-semibold">wpm</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">正解率</span>
                <Input type="number" value={accuracy} onChange={(e) => setAccuracy(e.target.value)}
                  placeholder="—" className="h-8 text-center text-sm w-16 bg-background rounded-lg border-border" />
                <span className="text-xs text-muted-foreground font-semibold">%</span>
              </div>
            </div>
            
            <div className="p-3 border border-dashed border-border rounded-xl bg-muted/20">
              <p className="text-[10px] text-muted-foreground text-center mb-2">〜 Note 〜</p>
              <Textarea placeholder="音読の気づきや難しかった発音などをメモ..." className="min-h-20 border-0 bg-transparent text-sm resize-none p-0 focus-visible:ring-0" />
            </div>
          </div>
        </div>

        {/* ─── AI Feedback (if available) ─── */}
        {feedback && (
          <div className="premium-card rounded-2xl p-4 border-l-4 border-l-primary bg-card shadow-sm">
            <h4 className="font-semibold text-foreground mb-2 text-sm flex items-center gap-2">
              <Star size={14} className="text-amber-500" /> AIコーチからのフィードバック
            </h4>
            <div className="text-sm text-foreground leading-relaxed">
              <Streamdown>{feedback}</Streamdown>
            </div>
          </div>
        )}

        {/* ─── Complete & Navigation ─── */}
        <div className="space-y-3 pt-2">
          {!isCompleted && (
            <Button onClick={() => completeLesson.mutate({ lessonId })} disabled={completeLesson.isPending}
              className="w-full h-12 pride-gradient border-0 text-white font-semibold rounded-xl hover:opacity-90 text-base active:scale-[0.98] transition-all">
              {completeLesson.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
              レッスンを完了する
            </Button>
          )}
          {isCompleted && (
            <div className="text-center py-3 text-emerald-600 font-semibold text-sm flex items-center justify-center gap-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <CheckCircle2 size={18} /> このレッスンは完了済みです
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5">
            <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lessonId - 1}`)} disabled={lessonId <= 1} className="rounded-xl flex-1 h-9 font-bold">
              <ChevronLeft size={14} className="mr-1" /> 前のレッスン
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lessonId + 1}`)} className="rounded-xl flex-1 h-9 font-bold">
              次のレッスン <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

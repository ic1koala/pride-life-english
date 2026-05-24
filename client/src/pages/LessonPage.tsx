import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mic, MicOff, Play, Pause, Square, CheckCircle2, Loader2,
  BookOpen, PenLine, Volume2, ChevronLeft, ChevronRight, Star,
  SkipBack, SkipForward, RotateCcw, Settings2, Eye, Headphones,
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

/* ── Custom Audio Player ── */
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [skipSec, setSkipSec] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onDur); a.removeEventListener("ended", onEnd); };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const skip = (sec: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + sec));
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (a) { a.currentTime = parseFloat(e.target.value); setCurrentTime(a.currentTime); }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        {/* Skip back */}
        <button onClick={() => skip(-skipSec)} className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95" title={`${skipSec}秒戻す`}>
          <SkipBack size={18} className="text-muted-foreground" />
        </button>
        {/* Play/Pause */}
        <button onClick={toggle} className="w-11 h-11 rounded-full pride-gradient flex items-center justify-center shadow-md hover:opacity-90 transition-opacity active:scale-95">
          {playing ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
        </button>
        {/* Skip forward */}
        <button onClick={() => skip(skipSec)} className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95" title={`${skipSec}秒進む`}>
          <SkipForward size={18} className="text-muted-foreground" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
            onChange={seek}
            className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Settings */}
        <div className="relative">
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings2 size={14} className="text-muted-foreground" />
          </button>
          {showSettings && (
            <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl p-3 shadow-lg z-10 w-40">
              <p className="text-[10px] text-muted-foreground mb-1.5">スキップ秒数</p>
              <div className="flex gap-1">
                {[1, 3, 5, 10].map((s) => (
                  <button key={s} onClick={() => { setSkipSec(s); setShowSettings(false); }}
                    className={cn("flex-1 py-1 rounded-lg text-xs font-medium transition-colors",
                      skipSec === s ? "pride-gradient text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}>
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          )}
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

  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [wpm, setWpm] = useState("");
  const [accuracy, setAccuracy] = useState("");

  // Speaking practice state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Checklist state for textbook sections
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (myProgress?.journalEntry) setJournalText(myProgress.journalEntry ?? "");
    if (myProgress?.speakingTranscription) setTranscription(myProgress.speakingTranscription ?? "");
    if (myProgress?.speakingFeedback) setFeedback(myProgress.speakingFeedback ?? "");
  }, [myProgress]);

  const saveJournal = trpc.progress.saveJournal.useMutation({
    onSuccess: () => { setJournalSaved(true); toast.success("ジャーナルを保存しました"); setTimeout(() => setJournalSaved(false), 3000); },
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

  const uploadAudio = trpc.speaking.uploadAudio.useMutation();
  const transcribeAndFeedback = trpc.speaking.transcribeAndFeedback.useMutation({
    onSuccess: (data) => {
      setTranscription(data.transcription);
      setFeedback(data.feedback);
      setProcessingAudio(false);
      toast.success("AIフィードバックが完了しました！");
    },
    onError: () => { setProcessingAudio(false); toast.error("処理に失敗しました"); },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch { toast.error("マイクへのアクセスを許可してください"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const submitAudio = async () => {
    if (!audioBlob || !lesson) return;
    setProcessingAudio(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const { key, url } = await uploadAudio.mutateAsync({ lessonId, audioBase64: base64, mimeType: "audio/webm" });
        await transcribeAndFeedback.mutateAsync({ lessonId, audioKey: key, audioUrl: url, speakingPrompt: lesson.speakingPrompt ?? "" });
      };
      reader.readAsDataURL(audioBlob);
    } catch { setProcessingAudio(false); toast.error("アップロードに失敗しました"); }
  };

  const toggleCheck = (key: string) => setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

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
                  <CheckCircle2 size={10} /> 完了
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

      <div className="px-4 sm:px-6 space-y-4">
        {/* ─── Section 1: Quizlet 練習 ─── */}
        <div className="premium-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">◇ ○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">Quizlet 練習</h3>
            </div>
            <button onClick={() => toggleCheck("quizlet")}
              className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                checklist.quizlet ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
              )}>
              {checklist.quizlet && <CheckCircle2 size={14} className="text-white" />}
            </button>
          </div>
        </div>

        {/* ─── Section 2: 動画を見る ─── */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">□ ◇ ○ ☆</span>
                <h3 className="text-sm font-bold text-foreground">動画を見る</h3>
              </div>
              <button onClick={() => toggleCheck("video")}
                className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                  checklist.video ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                )}>
                {checklist.video && <CheckCircle2 size={14} className="text-white" />}
              </button>
            </div>
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

          {/* Audio player (if audio URL exists) */}
          {lesson.videoUrl && (
            <div className="px-4 pb-4">
              <AudioPlayer src={lesson.videoUrl} />
            </div>
          )}

          {/* Note section */}
          <div className="px-4 pb-4">
            <div className="border border-dashed border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground text-center mb-2">〜 Note 〜</p>
              <Textarea placeholder="メモを入力..." className="min-h-20 border-0 bg-transparent text-sm resize-none p-0 focus-visible:ring-0" />
            </div>
          </div>
        </div>

        {/* ─── Section 3: ジャーナリング ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left: Journaling */}
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">○ ☆</span>
              <h3 className="text-sm font-bold text-foreground">ジャーナリング</h3>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Question:</p>
              <p className="text-sm text-foreground italic leading-relaxed">
                {lesson.journalingPrompt || "How would you describe your ideal day?"}
              </p>
            </div>
            <Textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="英語で自由に書いてみましょう..."
              className="min-h-32 rounded-xl border-border resize-none text-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground">{journalText.length} 文字</span>
              <Button size="sm"
                onClick={() => saveJournal.mutate({ lessonId, journalEntry: journalText })}
                disabled={saveJournal.isPending || !journalText.trim()}
                className={cn("rounded-lg text-xs h-7", journalSaved ? "bg-emerald-500 text-white" : "pride-gradient border-0 text-white")}>
                {saveJournal.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                {journalSaved ? "保存済み" : "保存"}
              </Button>
            </div>
          </div>

          {/* Right: Speaking practice */}
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">☆</span>
              <h3 className="text-sm font-bold text-foreground">ジャーナリングで話す練習</h3>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border mb-3 min-h-20">
              <p className="text-xs text-muted-foreground mb-1">あなたの回答を声に出して練習しましょう</p>
              {transcription && (
                <p className="text-sm text-foreground italic mt-1">"{transcription}"</p>
              )}
            </div>

            {/* Record button */}
            <div className="flex flex-col items-center gap-3 mb-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-md active:scale-95",
                  isRecording ? "bg-red-500 animate-pulse" : "pride-gradient hover:opacity-90"
                )}
              >
                {isRecording ? <Square size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {isRecording ? "録音中... タップで停止" : audioBlob ? "録音完了" : "タップで録音開始"}
              </p>
              {audioBlob && !isRecording && (
                <Button size="sm" onClick={submitAudio} disabled={processingAudio}
                  className="pride-gradient border-0 text-white rounded-lg text-xs h-8">
                  {processingAudio ? <><Loader2 size={12} className="animate-spin mr-1" /> 処理中...</> : "AIフィードバックを受ける"}
                </Button>
              )}
            </div>

            {/* Sub-sections matching textbook */}
            <div className="space-y-2">
              {[
                { icon: "☆", label: "音読", key: "ondoku" },
                { icon: "☆", label: "リードアンドルックアップ", key: "readlookup" },
                { icon: "☆", label: "瞬間解答", key: "shunkan" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.icon}</span>
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                  </div>
                  <button onClick={() => toggleCheck(item.key)}
                    className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      checklist[item.key] ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    )}>
                    {checklist[item.key] && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Section 4: 日本語訳を読む & 音読 ─── */}
        <div className="premium-card rounded-2xl p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">◇ ○ ☆</span>
                <h3 className="text-sm font-bold text-foreground">日本語訳を読む</h3>
              </div>
              <button onClick={() => toggleCheck("jpread")}
                className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                  checklist.jpread ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                )}>
                {checklist.jpread && <CheckCircle2 size={14} className="text-white" />}
              </button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">◇ ○ ☆</span>
                <h3 className="text-sm font-bold text-foreground">音読</h3>
              </div>
              <button onClick={() => toggleCheck("ondoku2")}
                className={cn("w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                  checklist.ondoku2 ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                )}>
                {checklist.ondoku2 && <CheckCircle2 size={14} className="text-white" />}
              </button>
            </div>

            {/* WPM & Accuracy */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">初見WPM</span>
                <Input type="number" value={wpm} onChange={(e) => setWpm(e.target.value)}
                  placeholder="—" className="h-8 text-center text-sm w-16" />
                <span className="text-xs text-muted-foreground">wpm</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">正解率</span>
                <Input type="number" value={accuracy} onChange={(e) => setAccuracy(e.target.value)}
                  placeholder="—" className="h-8 text-center text-sm w-16" />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Note ─── */}
        <div className="premium-card rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground text-center mb-2">〜 Note 〜</p>
          <Textarea placeholder="今日の気づきやメモ..." className="min-h-20 border-0 bg-transparent text-sm resize-none p-0 focus-visible:ring-0" />
        </div>

        {/* ─── AI Feedback (if available) ─── */}
        {feedback && (
          <div className="premium-card rounded-2xl p-4 border-l-4 border-l-primary">
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
            <div className="text-center py-3 text-emerald-600 font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> このレッスンは完了済みです
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lessonId - 1}`)} disabled={lessonId <= 1} className="rounded-xl">
              <ChevronLeft size={14} className="mr-1" /> 前のレッスン
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/lessons/${lessonId + 1}`)} className="rounded-xl">
              次のレッスン <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

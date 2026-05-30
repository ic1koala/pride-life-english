import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreditCard, User, Bell, Loader2, ExternalLink, LogOut, BookOpen, Calendar, Star, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600 bg-green-50",
  inactive: "text-gray-600 bg-gray-50",
  past_due: "text-red-600 bg-red-50",
  canceled: "text-red-600 bg-red-50",
  trialing: "text-blue-600 bg-blue-50",
};

const BADGES = [
  {
    id: "term_1_complete",
    name: "1st Half Badge",
    img: "/badges/badge_1st_half.png",
    desc: "1stターム（最初の6ヶ月間・96レッスン）を完走した学習者に贈られる栄誉ある証！",
    progress: (completed: number) => `進捗: ${Math.min(completed, 96)} / 96 レッスン`
  },
  {
    id: "term_2_complete",
    name: "2nd Half Badge",
    img: "/badges/badge_2nd_half.png",
    desc: "2ndターム（後半の6ヶ月間・96レッスン）を最後まで完走した者に贈られる輝かしいメダル！",
    progress: (completed: number) => completed < 96 ? "1stタームを完走するとカウント開始" : `進捗: ${Math.min(completed - 96, 96)} / 96 レッスン`
  },
  {
    id: "course_complete",
    name: "Complete Badge",
    img: "/badges/badge_complete.png",
    desc: "1年間（計192レッスン）を完全完走し、自分らしさを誇れる本物の英語力を手に入れた絶対的卒業証明！",
    progress: (completed: number) => `全体進捗: ${Math.min(completed, 192)} / 192`
  },
  {
    id: "master_badge",
    name: "Master Badge",
    img: "/badges/badge_master.png",
    desc: "全カリキュラムを完走し、さらに全てのデイリータスクを完遂した究極の英語マスターバッジ！",
    progress: (completed: number) => `獲得条件: 192レッスン ＋ 全タスククリア`
  }
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  const { data: profileData, refetch: refetchProfile } = trpc.auth.profile.useQuery();
  const { data: semesterData } = trpc.subscription.semesterStatus.useQuery();
  const { data: progressSummary } = trpc.progress.summary.useQuery();

  const updateAvatarMutation = trpc.auth.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("プロフィール写真を更新しました！");
      refetchProfile();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message || "写真のアップデートに失敗しました"),
  });

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          updateAvatarMutation.mutate({ avatarUrl: compressedBase64 });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const portalMutation = trpc.stripe.getPortalUrl.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Opening billing portal...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Could not open billing portal"),
  });

  const switchCourseMutation = trpc.subscription.switchCourse.useMutation({
    onSuccess: (data) => {
      toast.success(data.activeCourse === "star" ? "☆コースに切り替えました！全タスクが解放されます。" : "Knowledgeコースに切り替えました。動画視聴に集中しましょう！");
      refetchProfile();
      utils.subscription.semesterStatus.invalidate();
    },
    onError: (err) => toast.error(err.message || "コース切替に失敗しました"),
  });

  const requestRestMutation = trpc.subscription.requestRest.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "次学期の休会申請が完了しました");
      refetchProfile();
      utils.subscription.semesterStatus.invalidate();
    },
    onError: (err) => toast.error(err.message || "休会申請に失敗しました"),
  });

  const subscriptionStatus = profileData?.subscriptionStatus ?? (user as any)?.subscriptionStatus ?? "inactive";
  const activeCourse = profileData?.activeCourse ?? "star";
  const completedLessons = progressSummary?.completed ?? 0;

  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          <span className="pride-gradient-text">Account</span>
        </h1>
        <p className="text-muted-foreground mt-1">アカウントプロフィールとサブスクリプションの管理</p>
      </div>

      <div className="h-1 rounded-full pride-gradient" />

      {/* Profile */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <User size={18} className="text-blue-600" />
          </div>
          <h2 className="font-semibold text-foreground">Profile</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl group overflow-hidden shrink-0 shadow-md border border-border/50">
            {profileData?.avatarUrl || user?.avatarUrl ? (
              <img src={profileData?.avatarUrl || user?.avatarUrl || ""} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full pride-gradient flex items-center justify-center text-white text-2xl font-bold">
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className={cn(
                "absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white",
                updateAvatarMutation.isPending && "opacity-100 bg-black/60"
              )}
            >
              {updateAvatarMutation.isPending ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <span className="text-[10px] font-bold tracking-wider">変更する</span>
              )}
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={updateAvatarMutation.isPending}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{user?.name ?? "—"}</p>
            <p className="text-muted-foreground text-sm">{(user as any)?.email ?? "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize", STATUS_COLORS[subscriptionStatus] ?? "text-gray-600 bg-gray-50")}>
                {subscriptionStatus}
              </span>
              {(user as any)?.role === "admin" && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Admin</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <CreditCard size={18} className="text-green-600" />
          </div>
          <h2 className="font-semibold text-foreground">Subscription</h2>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/30 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Pride Life English Membership</p>
              <p className="text-sm text-muted-foreground mt-0.5">¥9,800/month · 6-month course</p>
            </div>
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold capitalize", STATUS_COLORS[subscriptionStatus] ?? "text-gray-600 bg-gray-50")}>
              {subscriptionStatus}
            </span>
          </div>
        </div>

        {subscriptionStatus === "active" && (
          <Button
            onClick={() => portalMutation.mutate({ origin: window.location.origin })}
            disabled={portalMutation.isPending}
            variant="outline"
            className="rounded-xl"
          >
            {portalMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <ExternalLink size={16} className="mr-2" />}
            決済情報の管理 (Stripe)
          </Button>
        )}

        {subscriptionStatus !== "active" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">サブスクリプションが有効ではありません。</p>
            <p className="text-xs text-red-600 mt-1">再度レッスンを開始するには、お支払い方法を更新してください。</p>
            <p className="text-xs text-muted-foreground mt-2">
              💡 <strong>復学について</strong>: また頑張れるようになったら、次の学期から同じ続きの月でいつでも戻ってこれます。経過データはすべて保存されています。
            </p>
          </div>
        )}
      </div>

      {/* 📚 Course Switch Card (コース切替) */}
      <div className="premium-card rounded-2xl p-6 border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <BookOpen size={18} className="text-violet-500" />
          </div>
          <h2 className="font-semibold text-foreground">コース切替</h2>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            忙しい時期は動画視聴のみの <strong>Knowledgeコース</strong> に切り替え、余裕がある時は全タスクの <strong>☆コース</strong> で学びましょう。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ☆ Course */}
            <button
              onClick={() => activeCourse !== "star" && switchCourseMutation.mutate({ course: "star" })}
              disabled={switchCourseMutation.isPending}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                activeCourse === "star"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40 bg-card"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Star size={16} className={activeCourse === "star" ? "text-primary" : "text-muted-foreground"} />
                <span className="text-sm font-bold text-foreground">☆コース（フルコース）</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                9タスクすべて対象。単語練習・動画・ジャーナリング・音読系全般。最大 520 pt / レッスン
              </p>
              {activeCourse === "star" && (
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">✓ 現在選択中</span>
              )}
            </button>

            {/* Knowledge Course */}
            <button
              onClick={() => activeCourse !== "knowledge" && switchCourseMutation.mutate({ course: "knowledge" })}
              disabled={switchCourseMutation.isPending}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200",
                activeCourse === "knowledge"
                  ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20"
                  : "border-border hover:border-sky-400/40 bg-card"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className={activeCourse === "knowledge" ? "text-sky-600" : "text-muted-foreground"} />
                <span className="text-sm font-bold text-foreground">Knowledgeコース（動画のみ）</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                動画を見るタスクのみ対象。忙しい時期に知識だけでも得たい方向け。20 pt / レッスン
              </p>
              {activeCourse === "knowledge" && (
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">✓ 現在選択中</span>
              )}
            </button>
          </div>

          {switchCourseMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin" /> コースを切り替え中...
            </div>
          )}
        </div>
      </div>

      {/* 📅 Semester Contract Card (学期契約情報) */}
      <div className="premium-card rounded-2xl p-6 border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Calendar size={18} className="text-amber-500" />
          </div>
          <h2 className="font-semibold text-foreground">学期契約情報</h2>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="bg-muted/40 rounded-xl p-4 border border-border/40">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">学期</span>
                <span className="font-bold text-foreground text-sm">第{semesterData?.semesterNumber ?? 1}期</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">契約期間</span>
                <span className="font-bold text-foreground text-sm">6ヶ月</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">開始日</span>
                <span className="font-semibold text-foreground">{formatDate(semesterData?.semesterStartDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">申請ウィンドウ</span>
                <span className="font-semibold text-foreground text-[11px]">
                  {formatDate(semesterData?.windowStart)} 〜 {formatDate(semesterData?.windowEnd)}
                </span>
              </div>
            </div>
          </div>

          <div className="leading-relaxed text-xs">
            <p className="font-semibold text-foreground mb-1">📌 学期契約のルール</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>6ヶ月の定期契約です。途中の休会・退会は原則できません。</li>
              <li>次学期の継続/休会は <strong>申請ウィンドウ期間</strong>（5ヶ月目20日〜6ヶ月目末）にのみ申請できます。</li>
              <li>6ヶ月を完走して休会する場合、過去のアーカイブ閲覧権限は維持されます。</li>
            </ul>
          </div>

          {semesterData?.inWindow ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs text-emerald-700 font-semibold">🟢 現在、申請ウィンドウ期間中です</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">次の学期への継続/休会を申請できます。</p>
              </div>
              <Button
                onClick={() => {
                  if (confirm("次の学期を休会しますか？\n\n• 過去のアーカイブ閲覧権限は維持されます\n• Stripeの自動更新が停止されます\n• また戻りたくなったらいつでも復学できます")) {
                    requestRestMutation.mutate();
                  }
                }}
                disabled={requestRestMutation.isPending}
                className="w-full rounded-xl font-bold text-xs h-9 bg-amber-500 text-white hover:bg-amber-600"
              >
                {requestRestMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                次の学期を休む（完走者休会）
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground">
                ⏳ 申請ウィンドウは <strong>{formatDate(semesterData?.windowStart)}</strong> から開きます。
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>途中退会について</strong>: どうしても途中で受講が難しい場合は、サブスクを解約（退会）してください。
              また頑張れるようになったら、次の期に同じ学期の続きの月からいつでも復学できます。経過データはすべて保存されます。
            </p>
          </div>
        </div>
      </div>

      {/* 🏆 Badges / 獲得バッジ */}
      <div className="premium-card rounded-2xl p-6 border border-border/80 bg-card/80 backdrop-blur-md shadow-sm relative overflow-hidden">
        {/* Background glow decorator */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center shadow-inner">
            <Star size={20} className="text-pink-500 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">学習バッジコレクション</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pride Life Englishのカリキュラム進捗に応じて獲得できる特別な限定バッジです</p>
          </div>
        </div>

        <div className="h-[1px] w-full bg-border/40 my-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BADGES.map((badge) => {
            const earnedBadge = progressSummary?.milestones?.find((m: any) => m.badgeType === badge.id);
            const isAcquired = !!earnedBadge;
            
            // Format earned date if available
            const earnedDateStr = earnedBadge?.earnedAt
              ? new Date(earnedBadge.earnedAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "";

            // Calculate progress parameters
            let percentage = 0;
            let progressLabel = "";
            let motivationText = "";
            let colorThemeClass = "";
            let progressGradient = "";

            if (badge.id === "term_1_complete") {
              percentage = Math.min(100, Math.round((completedLessons / 96) * 100));
              progressLabel = `${Math.min(completedLessons, 96)} / 96 レッスン`;
              motivationText = completedLessons >= 96 ? "1stタームを見事完走しました！" : `あと ${96 - completedLessons} レッスンでアンロック！`;
              colorThemeClass = "hover:border-pink-500/30 hover:bg-pink-500/[0.02]";
              progressGradient = "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500";
            } else if (badge.id === "term_2_complete") {
              const term2Progress = completedLessons < 96 ? 0 : completedLessons - 96;
              percentage = completedLessons < 96 ? 0 : Math.min(100, Math.round((term2Progress / 96) * 100));
              progressLabel = completedLessons < 96 ? "0 / 96 レッスン" : `${Math.min(term2Progress, 96)} / 96 レッスン`;
              motivationText = completedLessons < 96 
                ? "1stターム完走後に挑戦可能になります" 
                : (completedLessons >= 192 ? "2ndタームを完全完走しました！" : `あと ${192 - completedLessons} レッスンでアンロック！`);
              colorThemeClass = "hover:border-amber-500/30 hover:bg-amber-500/[0.02]";
              progressGradient = "bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500";
            } else if (badge.id === "course_complete") {
              percentage = Math.min(100, Math.round((completedLessons / 192) * 100));
              progressLabel = `${Math.min(completedLessons, 192)} / 192 レッスン`;
              motivationText = completedLessons >= 192 ? "コース全カリキュラムを完全制覇！" : `あと ${192 - completedLessons} レッスンで完全卒業！`;
              colorThemeClass = "hover:border-violet-600/30 hover:bg-violet-600/[0.02]";
              progressGradient = "bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500";
            } else if (badge.id === "master_badge") {
              percentage = Math.min(100, Math.round((completedLessons / 192) * 100));
              progressLabel = `${Math.min(completedLessons, 192)} / 192 レッスン`;
              motivationText = completedLessons >= 192 ? "全課題完全コンプリートの偉業！" : "192レッスン完走＋全デイリー課題クリアでアンロック！";
              colorThemeClass = "hover:border-cyan-500/30 hover:bg-cyan-500/[0.02]";
              progressGradient = "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500";
            }

            return (
              <div
                key={badge.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-500 relative flex flex-col group overflow-hidden bg-muted/10 border-border/50",
                  isAcquired
                    ? "bg-white/60 dark:bg-black/20 border-primary/10 shadow-sm hover:scale-[1.03] hover:shadow-lg hover:border-primary/30"
                    : "opacity-90 grayscale-[20%]",
                  colorThemeClass
                )}
              >
                {/* Glow effect on hover for unlocked badges */}
                {isAcquired && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/[0.03] to-amber-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}

                <div className="flex gap-4 items-start">
                  {/* Badge Image slot */}
                  <div className="w-20 h-20 relative flex items-center justify-center shrink-0">
                    <img
                      src={badge.img}
                      alt={badge.name}
                      className={cn(
                        "w-full h-full object-contain transition-all duration-700",
                        isAcquired
                          ? "drop-shadow-[0_8px_16px_rgba(236,72,153,0.3)] filter-none scale-100 group-hover:scale-105"
                          : "filter grayscale opacity-30 contrast-75 brightness-[60%] scale-90 blur-[0.2px] hover:scale-95"
                      )}
                    />
                    {!isAcquired && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-background/90 shadow-md border border-border/80 flex items-center justify-center text-xs text-muted-foreground/60 transition-transform group-hover:scale-110">
                          🔒
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badge Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                      {badge.name === "1st Half Badge" && "1st Half (前半戦完走)"}
                      {badge.name === "2nd Half Badge" && "2nd Half (後半戦完走)"}
                      {badge.name === "Complete Badge" && "Complete (完全卒業)"}
                      {badge.name === "Master Badge" && "Master (究極の覇者)"}
                      {isAcquired && <span className="text-xs text-primary animate-pulse">✨</span>}
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-normal mb-2">
                      {badge.desc}
                    </p>
                  </div>
                </div>

                {/* Unlocking / Progress Info */}
                <div className="w-full mt-4 pt-3 border-t border-border/40 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span
                      className={cn(
                        "font-bold px-2 py-0.5 rounded-full tracking-wider uppercase",
                        isAcquired
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground/70"
                      )}
                    >
                      {isAcquired ? "✓ 獲得済み" : "🔒 未取得"}
                    </span>
                    <span className="font-mono font-semibold text-muted-foreground/80">
                      {progressLabel}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-1000 ease-out", progressGradient)}
                      style={{ width: `${isAcquired ? 100 : percentage}%` }}
                    />
                  </div>

                  {/* Gamified feedback text */}
                  <div className="flex justify-between items-center text-[10px] mt-0.5">
                    <p className="text-muted-foreground font-medium truncate max-w-[220px]">
                      {motivationText}
                    </p>
                    {isAcquired && earnedDateStr && (
                      <span className="text-muted-foreground/60 italic">
                        {earnedDateStr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications info */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
            <Bell size={18} className="text-yellow-600" />
          </div>
          <h2 className="font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pride-gradient" />
            <span>Daily login bonus reminders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pride-gradient" />
            <span>New lesson availability alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pride-gradient" />
            <span>Milestone badge notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full pride-gradient" />
            <span>Payment status alerts</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Notifications appear in the bell icon at the top of the page.</p>
      </div>

      {/* Sign out */}
      <div className="premium-card rounded-2xl p-6">
        <h2 className="font-semibold text-foreground mb-3">Account</h2>
        <Button
          variant="outline"
          onClick={() => logout()}
          className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
        >
          <LogOut size={16} className="mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

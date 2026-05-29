import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreditCard, User, Bell, Loader2, ExternalLink, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600 bg-green-50",
  inactive: "text-gray-600 bg-gray-50",
  past_due: "text-red-600 bg-red-50",
  canceled: "text-red-600 bg-red-50",
  trialing: "text-blue-600 bg-blue-50",
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  const { data: profileData, refetch: refetchProfile } = trpc.auth.profile.useQuery();

  const portalMutation = trpc.stripe.getPortalUrl.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Opening billing portal...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Could not open billing portal"),
  });

  const suspendMutation = trpc.subscription.suspend.useMutation({
    onSuccess: () => {
      toast.success("休会申請が完了しました。来月分の決済が一時停止されます。");
      refetchProfile();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message || "休会申請に失敗しました"),
  });

  const resumeMutation = trpc.subscription.resume.useMutation({
    onSuccess: () => {
      toast.success("受講が再開されました！お帰りなさい！🌈");
      refetchProfile();
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message || "受講再開に失敗しました"),
  });

  const subscriptionStatus = profileData?.subscriptionStatus ?? (user as any)?.subscriptionStatus ?? "inactive";
  const suspensionsUsed = profileData?.suspensionsUsedCount ?? 0;
  const remainingSuspensions = Math.max(0, 2 - suspensionsUsed);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          <span className="pride-gradient-text">Settings</span>
        </h1>
        <p className="text-muted-foreground mt-1">アカウント設定とサブスクリプションの管理</p>
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
          <div className="w-16 h-16 rounded-2xl pride-gradient flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {(user?.name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{user?.name ?? "—"}</p>
            <p className="text-muted-foreground text-sm">{(user as any)?.email ?? "—"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize", STATUS_COLORS[subscriptionStatus] ?? "text-gray-600 bg-gray-50")}>
                {subscriptionStatus === "suspended" ? "休会中 (Suspended)" : subscriptionStatus}
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
              {subscriptionStatus === "suspended" ? "休会中" : subscriptionStatus}
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

        {subscriptionStatus === "suspended" && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-sm text-amber-700 font-semibold">現在、アカウントは一時休会中です。</p>
            <p className="text-xs text-amber-600 mt-1">Stripeの自動決済は一時停止されています。いつでも以下の「受講を再開する」ボタンから即時に学習と請求を再開できます。</p>
          </div>
        )}

        {subscriptionStatus !== "active" && subscriptionStatus !== "suspended" && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">サブスクリプションが有効ではありません。</p>
            <p className="text-xs text-red-600 mt-1">再度レッスンを開始するには、お支払い方法を更新してください。</p>
          </div>
        )}
      </div>

      {/* Membership Suspension (休会制度) Card */}
      <div className="premium-card rounded-2xl p-6 border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Bell size={18} className="text-amber-500" />
          </div>
          <h2 className="font-semibold text-foreground">受講の休会・再開制度</h2>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="leading-relaxed">
            多忙な時期やライフスタイルの変化に対応するため、月払い会員様は**1ヶ月単位で休会**することができます。
          </p>
          <div className="bg-muted/40 rounded-xl p-4 border border-border/40">
            <div className="flex justify-between items-center text-xs font-semibold text-foreground">
              <span>6ヶ月契約内の休会上限: 2回</span>
              <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                残り {remainingSuspensions} 回利用可能
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              これまでの使用回数: {suspensionsUsed} / 2 回
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {subscriptionStatus === "active" && (
              <Button
                onClick={() => {
                  if (confirm("本当に1ヶ月休会しますか？ Stripeでの来月の引き落としが一時停止され、再開するまで学習機能がロックされます。")) {
                    suspendMutation.mutate();
                  }
                }}
                disabled={suspendMutation.isPending || remainingSuspensions <= 0}
                className={cn("w-full rounded-xl font-bold text-xs h-9", remainingSuspensions <= 0 ? "bg-muted text-muted-foreground" : "bg-amber-500 text-white hover:bg-amber-600")}
              >
                {suspendMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                {remainingSuspensions <= 0 ? "休会上限に達しました (最大2回)" : "1ヶ月休会する"}
              </Button>
            )}

            {subscriptionStatus === "suspended" && (
              <Button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="w-full rounded-xl pride-gradient border-0 text-white font-bold text-xs h-9"
              >
                {resumeMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                受講を再開する 🌈
              </Button>
            )}
          </div>
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

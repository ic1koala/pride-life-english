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

  const portalMutation = trpc.stripe.getPortalUrl.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Opening billing portal...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Could not open billing portal"),
  });

  const subscriptionStatus = (user as any)?.subscriptionStatus ?? "inactive";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
          <span className="pride-gradient-text">Settings</span>
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
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
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", STATUS_COLORS[subscriptionStatus] ?? "text-gray-600 bg-gray-50")}>
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
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", STATUS_COLORS[subscriptionStatus] ?? "text-gray-600 bg-gray-50")}>
              {subscriptionStatus}
            </span>
          </div>
        </div>

        {subscriptionStatus === "active" ? (
          <Button
            onClick={() => portalMutation.mutate({ origin: window.location.origin })}
            disabled={portalMutation.isPending}
            variant="outline"
            className="rounded-xl"
          >
            {portalMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <ExternalLink size={16} className="mr-2" />}
            Manage Billing
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">Your subscription is not active.</p>
            <p className="text-xs text-red-600 mt-1">Please update your payment method to restore access.</p>
          </div>
        )}
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

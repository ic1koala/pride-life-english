import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const SO_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuDtnqiMEHoVtf95LpFgDutq2MfKUWAZxzQaNo3tvSerDrMnzrO9LTEp9qgtHQln_L6MPE5mQR5YnqQwYjTZXToqk0b6HT-LuvDz0k3H1fRngI5AUqwhoaEfGaPxHFKVXz_kCkywUzOCBERHSyvXuCMkFIap3sAnKg1OwD0OG4z7CsxERgry4OYGqjK4lfKr-YVjaXah7yXXt8QP4AddACZ-eWCoNDNyfSURvOeYstcGA-o-uScjrS8MgZx9vm9nHmRYIdRyKMIt6cc";
const SLIDE_BG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDPZFyZ09ySrfw7CO6ZjzF_XVw03u52c05zfav0kyEyQ0RRo_s5IsaxgaPtTGxwppEXDkwh4vS_0efAT8Hgre_1C4kBjoo_UQmxvC6a6oIfqrnnEOZwYX40iXcwVXaUAdVOkfBN1RxxKediUzNLXFdZPYGOjm08iRbq-hzllsnCAVG182IGsifoHtSQEv00a-XV52CHAoW6rgTZKjP1silVz2iFTcSWlu0BOFAhH4q1lohks-5MtilhBEio5SoJI0HZgJPIHwgl-E0";

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard");
  }, [user, authLoading]);

  const loginMut = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("ログインしました！");
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      if (err.message === "subscription_required") {
        toast.error("有効なサブスクリプションが必要です", {
          action: { label: "登録する", onClick: () => navigate("/register") },
        });
      } else {
        toast.error(err.message || "ログインに失敗しました");
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ─── Left: Hero panel (desktop) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <img src={SLIDE_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative z-10 text-center px-12">
          <img src={SO_LOGO} alt="SO ENGLISH!" className="w-28 h-28 mx-auto mb-6 drop-shadow-lg" />
          <h1 className="font-serif text-4xl font-bold text-white drop-shadow-lg mb-3">
            Pride Life English
          </h1>
          <p className="text-white/90 text-lg font-light max-w-md mx-auto leading-relaxed">
            自分らしく、英語で世界を広げよう。<br />
            6ヶ月間の特別な学びの旅。
          </p>
          <div className="mt-8 flex justify-center gap-1.5">
            {["#E53935","#FF6D00","#FFD600","#43A047","#1E88E5","#8E24AA"].map((c, i) => (
              <div key={i} className="w-8 h-1.5 rounded-full" style={{ background: c, opacity: 0.85 }} />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right: Login form ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-0 sunrise-bg">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={SO_LOGO} alt="SO ENGLISH!" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="font-serif text-2xl font-bold text-foreground">Pride Life English</h1>
            <p className="text-muted-foreground text-sm mt-1">会員専用ページ</p>
          </div>

          <div className="premium-card rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground mb-1">ログイン</h2>
            <p className="text-sm text-muted-foreground mb-6">メールアドレスとパスワードを入力してください</p>

            <form
              onSubmit={(e) => { e.preventDefault(); loginMut.mutate({ email, password }); }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">メールアドレス</Label>
                <Input
                  id="email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-11" required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">パスワード</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password" type={showPass ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10" required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loginMut.isPending}
                className="w-full h-11 pride-gradient text-white font-semibold border-0 hover:opacity-90 transition-opacity">
                {loginMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                ログイン
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                アカウントをお持ちでない方は
                <Link href="/register">
                  <span className="text-primary font-medium hover:underline ml-1 cursor-pointer">新規登録</span>
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
            ※ 有効なサブスクリプションをお持ちの方のみログインできます
          </p>
        </div>
      </div>
    </div>
  );
}

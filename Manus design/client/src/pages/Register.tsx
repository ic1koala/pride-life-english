import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2, CreditCard } from "lucide-react";

type Step = "account" | "checkout";

export default function Register() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setStep("checkout");
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
    },
  });

  const checkoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to secure checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error("Could not create checkout session. Please try again.");
    },
  });

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ name, email, password });
  };

  const handleCheckout = () => {
    checkoutMutation.mutate({ email, name, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "var(--sidebar)" }}>
        <div className="absolute inset-0 pride-gradient opacity-10" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl pride-gradient flex items-center justify-center text-white text-3xl font-bold shadow-2xl mb-8 float-animation">
            P
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight mb-4" style={{ color: "white" }}>
            Start Your<br />
            <span className="pride-gradient-text">Pride Journey</span>
          </h1>
          <p className="text-lg opacity-80 leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.8)" }}>
            Join a community of LGBT9+ English learners. 6 months of lessons, speaking practice, and growth.
          </p>

          {/* Pricing card */}
          <div className="rounded-2xl p-6 border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-white">¥9,800</span>
              <span className="text-sm opacity-70" style={{ color: "rgba(255,255,255,0.7)" }}>/month</span>
            </div>
            <p className="text-sm opacity-70 mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>6-month membership · Cancel anytime</p>
            <div className="space-y-2">
              {["120 video lessons", "AI speaking coach", "Community Q&A", "Progress tracking", "Milestone badges"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full pride-gradient opacity-10 translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-background">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl pride-gradient flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="font-serif text-xl font-bold text-foreground">Pride Life English</span>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 text-sm font-medium ${step === "account" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === "account" ? "pride-gradient text-white" : "bg-green-100 text-green-600"}`}>
                {step === "checkout" ? "✓" : "1"}
              </div>
              Account
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 text-sm font-medium ${step === "checkout" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === "checkout" ? "pride-gradient text-white" : "bg-muted text-muted-foreground"}`}>
                2
              </div>
              Payment
            </div>
          </div>

          <div className="h-1 rounded-full pride-gradient mb-8" />

          {step === "account" ? (
            <>
              <div className="mb-6">
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Create your account</h2>
                <p className="text-muted-foreground text-sm">Step 1 of 2 — Account details</p>
              </div>

              <form onSubmit={handleAccountSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8} className="h-12 rounded-xl pr-12" />
                    <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={registerMutation.isPending} className="w-full h-12 rounded-xl text-base font-semibold pride-gradient border-0 text-white hover:opacity-90 shadow-lg">
                  {registerMutation.isPending ? <><Loader2 size={18} className="animate-spin mr-2" />Creating account...</> : "Continue to Payment →"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Complete your subscription</h2>
                <p className="text-muted-foreground text-sm">Step 2 of 2 — Secure payment via Stripe</p>
              </div>

              <div className="p-5 rounded-xl border border-border bg-card mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-foreground">Pride Life English Membership</span>
                  <span className="font-bold text-foreground">¥9,800/mo</span>
                </div>
                <p className="text-sm text-muted-foreground">6-month course · 120 lessons · AI speaking coach</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Signed up as: <span className="font-medium text-foreground">{email}</span></p>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={checkoutMutation.isPending}
                className="w-full h-12 rounded-xl text-base font-semibold pride-gradient border-0 text-white hover:opacity-90 shadow-lg"
              >
                {checkoutMutation.isPending ? (
                  <><Loader2 size={18} className="animate-spin mr-2" />Preparing checkout...</>
                ) : (
                  <><CreditCard size={18} className="mr-2" />Pay with Stripe 🌈</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Secure payment powered by Stripe. Test card: 4242 4242 4242 4242
              </p>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href="/login">
                <span className="font-semibold text-primary hover:underline cursor-pointer">Sign in</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

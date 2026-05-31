import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  Calendar,
  Home,
  LogOut,
  Mail,
  MessageCircle,
  Settings,
  Shield,
  TrendingUp,
  User,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "./ui/badge";

const SO_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuDtnqiMEHoVtf95LpFgDutq2MfKUWAZxzQaNo3tvSerDrMnzrO9LTEp9qgtHQln_L6MPE5mQR5YnqQwYjTZXToqk0b6HT-LuvDz0k3H1fRngI5AUqwhoaEfGaPxHFKVXz_kCkywUzOCBERHSyvXuCMkFIap3sAnKg1OwD0OG4z7CsxERgry4OYGqjK4lfKr-YVjaXah7yXXt8QP4AddACZ-eWCoNDNyfSURvOeYstcGA-o-uScjrS8MgZx9vm9nHmRYIdRyKMIt6cc";

/* ─── Bottom tab items (mobile) ─────────────────────────────────────────────── */
const bottomTabs = [
  { href: "/dashboard", label: "ホーム", icon: Home, isExternal: false },
  { href: "/progress", label: "レッスン", icon: BookOpen, isExternal: false },
  { href: "/schedule", label: "スケジュール", icon: Calendar, isExternal: false },
  { href: "/settings", label: "マイページ", icon: User, isExternal: false },
];

/* ─── Sidebar nav items (desktop) ───────────────────────────────────────────── */
const sidebarNav = [
  { href: "/dashboard", label: "ホーム", labelEn: "Home", icon: Home, isExternal: false },
  { href: "/progress", label: "進捗トラッカー", labelEn: "Progress", icon: TrendingUp, isExternal: false },
  { href: "/schedule", label: "年間スケジュール", labelEn: "Schedule", icon: Calendar, isExternal: false },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: notifList } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation();
  const utils = trpc.useUtils();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleMarkRead = async () => {
    await markRead.mutateAsync();
    utils.notifications.unreadCount.invalidate();
    utils.notifications.list.invalidate();
  };

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false;
    return location === href || location.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Desktop Sidebar — hidden on mobile                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex-col transition-transform duration-300 ease-out",
          "hidden lg:flex"
        )}
        style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <Link href="/dashboard">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src={SO_LOGO} alt="SO ENGLISH!" className="w-10 h-10 rounded-xl object-contain bg-white/90 p-0.5" />
              <div>
                <div className="font-serif text-base font-bold leading-tight" style={{ color: "var(--sidebar-foreground)" }}>
                  Pride Life
                </div>
                <div className="text-[11px] font-medium opacity-60" style={{ color: "var(--sidebar-foreground)" }}>
                  English
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* User */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <Link href="/settings">
            <div className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/10 group-hover:ring-primary/55 transition-all" />
              ) : (
                <div className="w-9 h-9 rounded-full pride-gradient flex items-center justify-center text-white text-sm font-semibold shrink-0 group-hover:scale-105 transition-transform">
                  {(user?.name ?? "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors" style={{ color: "var(--sidebar-foreground)" }}>
                  {user?.name ?? "メンバー"}
                </p>
                <p className="text-[11px] opacity-50 truncate" style={{ color: "var(--sidebar-foreground)" }}>
                  {(user as any)?.email ?? ""}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidebarNav.map(({ href, label, icon: Icon, isExternal }) => {
            const active = isActive(href);
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150",
                  active
                    ? "text-white shadow-sm"
                    : isExternal
                      ? "text-[#06C755] font-semibold hover:bg-emerald-500/10"
                      : "opacity-70 hover:opacity-100"
                )}
                style={
                  active
                    ? { background: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" }
                    : isExternal
                      ? {}
                      : { color: "var(--sidebar-foreground)" }
                }
              >
                <Icon size={18} className={isExternal ? "text-[#06C755]" : ""} />
                <span>{label}</span>
              </div>
            );
            return isExternal ? (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="block">
                {content}
              </a>
            ) : (
              <Link key={href} href={href}>
                {content}
              </Link>
            );
          })}

          {(user as any)?.role === "admin" && (
            <Link href="/admin">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 mt-3",
                  isActive("/admin") ? "text-white shadow-sm" : "opacity-70 hover:opacity-100"
                )}
                style={
                  isActive("/admin")
                    ? { background: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" }
                    : { color: "var(--sidebar-foreground)" }
                }
              >
                <Shield size={18} />
                <span>管理者パネル</span>
              </div>
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Mobile Header                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={SO_LOGO} alt="SO ENGLISH!" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-serif text-sm font-bold text-foreground">Pride Life English</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {/* Notifications */}
            <button
              onClick={() => { setNotifOpen(o => !o); if (!notifOpen) handleMarkRead(); }}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell size={20} className="text-foreground" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 pride-gradient rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* More menu */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-out menu */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed top-14 right-0 bottom-0 z-50 w-64 bg-card border-l border-border lg:hidden overflow-y-auto animate-scale-in">
            <nav className="p-4 space-y-1">
              {sidebarNav.map(({ href, label, icon: Icon, isExternal }) => {
                const active = isActive(href);
                const content = (
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : isExternal
                          ? "text-[#06C755] font-semibold hover:bg-emerald-500/5"
                          : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon size={18} className={isExternal ? "text-[#06C755]" : ""} />
                    <span>{label}</span>
                  </div>
                );
                return isExternal ? (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="block">
                    {content}
                  </a>
                ) : (
                  <Link key={href} href={href}>
                    <div onClick={() => setSidebarOpen(false)}>{content}</div>
                  </Link>
                );
              })}
              {(user as any)?.role === "admin" && (
                <Link href="/admin">
                  <div
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors mt-2",
                      isActive("/admin") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Shield size={18} />
                    <span>管理者パネル</span>
                  </div>
                </Link>
              )}
              <div className="pt-3 border-t border-border mt-3">
                <button
                  onClick={() => { logout(); setSidebarOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium w-full text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span>ログアウト</span>
                </button>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Notification dropdown */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="fixed top-14 right-2 lg:top-4 lg:right-72 z-50 w-80 max-w-[calc(100vw-1rem)] bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">お知らせ</span>
              <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">閉じる</button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {(!notifList || notifList.length === 0) ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">お知らせはありません</div>
              ) : (
                notifList.map((n) => (
                  <div key={n.id} className={cn("px-4 py-3 border-b border-border last:border-0", !n.isRead && "bg-primary/5")}>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.createdAt).toLocaleDateString("ja-JP")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Desktop top bar (notification only)                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block fixed top-0 left-64 right-0 z-30 h-14 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-end px-6 h-full gap-3">
          <button
            onClick={() => { setNotifOpen(o => !o); if (!notifOpen) handleMarkRead(); }}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell size={20} className="text-foreground" />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 pride-gradient rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <Link href="/settings">
            <div className="w-8 h-8 rounded-full cursor-pointer overflow-hidden ring-2 ring-transparent hover:ring-primary/50 hover:scale-105 transition-all">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full pride-gradient flex items-center justify-center text-white text-xs font-semibold">
                  {(user?.name ?? "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Main content                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <main className="lg:ml-64 lg:pt-14 safe-bottom min-h-screen">
        {children}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Mobile Bottom Tab Bar                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bottom-tab-bar lg:hidden">
        <div className="flex items-center justify-around h-14">
          {bottomTabs.map(({ href, label, icon: Icon, isExternal }) => {
            const active = isActive(href);
            const content = (
              <div className="flex flex-col items-center justify-center gap-0.5 cursor-pointer min-w-[3.5rem] py-1">
                <Icon
                  size={20}
                  className={cn(
                    "transition-colors duration-150",
                    active
                      ? "text-primary"
                      : isExternal
                        ? "text-[#06C755]"
                        : "text-muted-foreground"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors duration-150",
                    active
                      ? "text-primary"
                      : isExternal
                        ? "text-[#06C755]"
                        : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full pride-gradient mt-0.5" />
                )}
              </div>
            );
            return isExternal ? (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <Link key={href} href={href}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

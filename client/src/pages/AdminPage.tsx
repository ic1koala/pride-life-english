import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line
} from "recharts";
import {
  Shield, Users, Search, TrendingUp, CheckCircle2, Loader2, BookOpen,
  Plus, Pencil, Trash2, Eye, EyeOff, HelpCircle, Trophy, Bell, Send,
  Flame, Star, Award, AlertTriangle, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-red-100 text-red-700",
  trialing: "bg-blue-100 text-blue-700",
};

type LessonForm = {
  weekNumber: number;
  dayNumber: number;
  title: string;
  description: string;
  videoUrl: string;
  journalingPrompt: string;
  speakingPrompt: string;
  publish: boolean;
};

const emptyForm: LessonForm = {
  weekNumber: 1, dayNumber: 1, title: "", description: "",
  videoUrl: "", journalingPrompt: "", speakingPrompt: "", publish: false,
};

const ADMIN_GUIDE_SECTIONS = [
  {
    title: "👥 メンバー管理 (Members)",
    desc: "受講生のステータス管理と進捗状況の可視化を行います。",
    steps: [
      "ステータスの変更: リストのドロップダウンからActive, Inactive, Past Dueなどの状態を即時に反映できます（Stripeと連動します）。",
      "進捗の確認: 各受講生の横にある『Progress』ボタンをクリックすると、完了レッスン数、累積ポイント、ストリーク日数、獲得バッジの一覧がポップアップで表示されます。"
    ]
  },
  {
    title: "📚 レッスン管理と3ターム制 (Lessons)",
    desc: "カリキュラム編集と、1年間の3ターム（計288レッスン）分割管理を行います。",
    steps: [
      "ターム切り替え: Lessonsタブの上部に配置された『Term 1』『Term 2』『Term 3』タブで、各期（96レッスン・24週間単位）ごとに表示をフィルタリングできます。",
      "レッスンの追加: 『Add Lesson』ボタンから新しい日次レッスンを作成します。選択中のタームに対応した週番号（例：Term 2表示時はWeek 25）が自動的にデフォルト設定されます。",
      "ドラフト/公開の切り替え: リスト内のトグルスイッチを操作することで、受講生へのレッスン公開・非公開を瞬時に制御できます。"
    ]
  },
  {
    title: "⚖️ 運用基本ルール (Platform Rules)",
    desc: "自動更新サブスクリプションおよびバッジ獲得の根幹ルールです。",
    steps: [
      "学期契約ルール: 6ヶ月の定期契約縛りです。途中での自己都合休会は原則不可となっており、期末のウィンドウ期間でのみ次期の休会を受け付けます。",
      "復学・データの保護: 途中で退会したメンバーでも進捗や獲得ポイント、バッジデータは完全に保持されます。いつでも同じレッスンの続きから復学可能です。",
      "バッジ獲得ルール: レッスン96完了時に 1st Half バッジ、レッスン192完了時に 2nd Half / Complete / Master バッジ（全課題クリア条件）が自動的に贈呈されます。"
    ]
  }
];

export default function AdminPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [lessonSearch, setLessonSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState<"term1" | "term2" | "term3">("term1");
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Notification form states
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyType, setNotifyType] = useState<"general" | "new_lesson" | "login_bonus" | "payment_failed">("general");
  const [confirmSend, setConfirmSend] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [selectedChartMembers, setSelectedChartMembers] = useState<string[]>([]);
  const [editingBroadcast, setEditingBroadcast] = useState<{
    oldTitle: string;
    oldMessage: string;
    oldType: string;
  } | null>(null);

  // ─── Members data ───────────────────────────────────────────────────────────
  const { data: members, isLoading } = trpc.admin.members.useQuery();
  const { data: memberProgress } = trpc.admin.memberProgress.useQuery(
    { userId: selectedUser! },
    { enabled: !!selectedUser }
  );

  const updateSub = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => { toast.success("Subscription updated!"); utils.admin.members.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const seedLessons = trpc.admin.seedLessons.useMutation({
    onSuccess: (d) => { toast.success(`${d.seeded} lessons seeded!`); utils.admin.listLessons.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  // ─── Leaderboard & Notification data ─────────────────────────────────────────
  const { data: leaderboard, isLoading: leaderboardLoading } = trpc.admin.leaderboard.useQuery();

  const sendGlobalNotificationMut = trpc.admin.sendGlobalNotification.useMutation({
    onSuccess: (res) => {
      toast.success(`全体お知らせを一斉配信しました！計 ${res.count} 名の受講生に送信されました。`);
      setNotifyTitle("");
      setNotifyMessage("");
      setNotifyType("general");
      setConfirmSend(false);
      utils.admin.listBroadcasts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "お知らせの配信に失敗しました。");
    }
  });

  // ─── Point History & Sent Broadcasts data ────────────────────────────────────
  const { data: pointHistoryData, isLoading: historyLoading } = trpc.admin.pointHistory.useQuery();
  const { data: sentBroadcasts } = trpc.admin.listBroadcasts.useQuery();

  const deleteBroadcastMut = trpc.admin.deleteBroadcast.useMutation({
    onSuccess: () => {
      toast.success("お知らせを削除しました。");
      utils.admin.listBroadcasts.invalidate();
    },
    onError: (err) => toast.error(err.message || "削除に失敗しました。")
  });

  const updateBroadcastMut = trpc.admin.updateBroadcast.useMutation({
    onSuccess: () => {
      toast.success("お知らせを更新して再送信しました！");
      utils.admin.listBroadcasts.invalidate();
      setNotifyTitle("");
      setNotifyMessage("");
      setNotifyType("general");
      setConfirmSend(false);
      setEditingBroadcast(null);
    },
    onError: (err) => toast.error(err.message || "更新に失敗しました。")
  });

  // Auto-initialize selected chart members to top 3 members
  useEffect(() => {
    if (pointHistoryData && selectedChartMembers.length === 0) {
      setSelectedChartMembers(pointHistoryData.members.slice(0, 3).map(m => m.name));
    }
  }, [pointHistoryData]);

  // ─── Lessons data ───────────────────────────────────────────────────────────
  const { data: allLessons, isLoading: lessonsLoading } = trpc.admin.listLessons.useQuery();

  const createLessonMut = trpc.admin.createLesson.useMutation({
    onSuccess: () => { toast.success("Lesson created!"); utils.admin.listLessons.invalidate(); setLessonDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const updateLessonMut = trpc.admin.updateLesson.useMutation({
    onSuccess: () => { toast.success("Lesson updated!"); utils.admin.listLessons.invalidate(); setLessonDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });

  const deleteLessonMut = trpc.admin.deleteLesson.useMutation({
    onSuccess: () => { toast.success("Lesson deleted!"); utils.admin.listLessons.invalidate(); setDeleteConfirmId(null); },
    onError: (err) => toast.error(err.message),
  });

  const togglePublishMut = trpc.admin.togglePublish.useMutation({
    onSuccess: () => { utils.admin.listLessons.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  // ─── Derived ────────────────────────────────────────────────────────────────
  const filtered = members?.filter((m) =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getTermWeeks = (term: "term1" | "term2" | "term3") => {
    switch (term) {
      case "term1": return { start: 1, end: 24 };
      case "term2": return { start: 25, end: 48 };
      case "term3": return { start: 49, end: 72 };
    }
  };

  const { start: termStartWeek, end: termEndWeek } = getTermWeeks(activeTerm);

  const filteredLessons = allLessons?.filter((l) => {
    // 1. Filter by term weeks range
    const inTerm = l.weekNumber >= termStartWeek && l.weekNumber <= termEndWeek;
    if (!inTerm) return false;

    // 2. Filter by search query
    return (
      !lessonSearch ||
      l.title.toLowerCase().includes(lessonSearch.toLowerCase()) ||
      `week ${l.weekNumber}`.includes(lessonSearch.toLowerCase()) ||
      `day ${l.dayNumber}`.includes(lessonSearch.toLowerCase())
    );
  }) ?? [];

  const activeCount = members?.filter((m) => m.subscriptionStatus === "active").length ?? 0;
  const totalCount = members?.length ?? 0;
  const publishedCount = allLessons?.filter((l) => l.publishedAt).length ?? 0;
  const filteredLeaderboard = leaderboard?.filter((user) =>
    !leaderboardSearch ||
    user.name?.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(leaderboardSearch.toLowerCase())
  ) ?? [];

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingLessonId(null);
    const defaultWeek = activeTerm === "term1" ? 1 : (activeTerm === "term2" ? 25 : 49);
    setForm({
      ...emptyForm,
      weekNumber: defaultWeek,
    });
    setIsMaximized(false);
    setLessonDialogOpen(true);
  };

  const openEditDialog = (lesson: any) => {
    setEditingLessonId(lesson.id);
    setForm({
      weekNumber: lesson.weekNumber,
      dayNumber: lesson.dayNumber,
      title: lesson.title,
      description: lesson.description ?? "",
      videoUrl: lesson.videoUrl ?? "",
      journalingPrompt: lesson.journalingPrompt ?? "",
      speakingPrompt: lesson.speakingPrompt ?? "",
      publish: !!lesson.publishedAt,
    });
    setIsMaximized(false);
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (editingLessonId) {
      updateLessonMut.mutate({ id: editingLessonId, ...form });
    } else {
      createLessonMut.mutate(form);
    }
  };

  const isSaving = createLessonMut.isPending || updateLessonMut.isPending;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
            <Shield size={32} className="text-primary" />
            Admin <span className="pride-gradient-text">Panel</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage members and course content</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            className="rounded-xl gap-2 font-bold text-xs shadow-sm bg-background border-primary/20 hover:border-primary/40 hover:bg-primary/[0.02]"
            onClick={() => setGuideOpen(true)}
          >
            <HelpCircle size={16} className="text-primary animate-pulse" />
            How to Use
          </Button>
        </div>
      </div>

      <div className="h-1 rounded-full pride-gradient" />

      {/* Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="members" className="gap-2">
            <Users size={16} /> Members
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-2">
            <BookOpen size={16} /> Lessons
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy size={16} /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell size={16} /> Broadcast
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* MEMBERS TAB                                                           */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="members" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Members", value: totalCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Active Subscribers", value: activeCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
              { label: "Past Due", value: members?.filter((m) => m.subscriptionStatus === "past_due").length ?? 0, icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
              { label: "Canceled", value: members?.filter((m) => m.subscriptionStatus === "canceled").length ?? 0, icon: Shield, color: "text-gray-600", bg: "bg-gray-50" },
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

          {/* Member table */}
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="font-serif text-xl font-semibold text-foreground flex-1">Members</h2>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members..."
                  className="pl-9 rounded-xl h-9 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Member</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Joined</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-5 py-3"><Skeleton className="h-5 w-40" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-5 w-20" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-5 w-16" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-5 w-24" /></td>
                        <td className="px-5 py-3"><Skeleton className="h-8 w-32" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No members found</td>
                    </tr>
                  ) : (
                    filtered.map((member) => (
                      <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full pride-gradient flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {(member.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{member.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{member.email ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", STATUS_COLORS[member.subscriptionStatus ?? "inactive"] ?? "bg-gray-100 text-gray-600")}>
                            {member.subscriptionStatus ?? "inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", member.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>
                            {member.role}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-muted-foreground">{new Date(member.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.subscriptionStatus ?? "inactive"}
                              onValueChange={(val) => updateSub.mutate({ userId: member.id, status: val as any })}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="past_due">Past Due</SelectItem>
                                <SelectItem value="canceled">Canceled</SelectItem>
                                <SelectItem value="trialing">Trialing</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-lg"
                              onClick={() => setSelectedUser(member.id)}
                            >
                              <TrendingUp size={12} className="mr-1" /> Progress
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* LESSONS TAB                                                           */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="lessons" className="space-y-6 mt-6">
          {/* Lesson stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="premium-card rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-50">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{allLessons?.length ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Lessons</div>
            </div>
            <div className="premium-card rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-green-50">
                <Eye size={20} className="text-green-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{publishedCount}</div>
              <div className="text-sm text-muted-foreground">Published</div>
            </div>
            <div className="premium-card rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-amber-50">
                <EyeOff size={20} className="text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-foreground">{(allLessons?.length ?? 0) - publishedCount}</div>
              <div className="text-sm text-muted-foreground">Drafts</div>
            </div>
          </div>

          {/* Term Selector Sub-tabs */}
          <div className="bg-muted/40 p-1 rounded-xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-2xl shadow-sm">
            <div className="flex items-center gap-2 px-2 shrink-0">
              <BookOpen size={14} className="text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground">ターム切り替え (Curriculum Terms):</span>
            </div>
            <div className="flex items-center gap-1 flex-1 w-full">
              {[
                { id: "term1", label: "Term 1 (W1-24)" },
                { id: "term2", label: "Term 2 (W25-48)" },
                { id: "term3", label: "Term 3 (W49-72)" },
              ].map((term) => (
                <button
                  key={term.id}
                  onClick={() => setActiveTerm(term.id as any)}
                  className={cn(
                    "flex-1 text-center py-1 rounded-lg text-[11px] font-bold transition-all duration-200 border border-transparent",
                    activeTerm === term.id
                      ? "bg-white dark:bg-slate-800 text-primary shadow-sm border-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {term.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={lessonSearch}
                onChange={(e) => setLessonSearch(e.target.value)}
                placeholder="Search lessons (title, week, day)..."
                className="pl-9 rounded-xl h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={openCreateDialog} className="rounded-xl gap-2 shadow-sm">
                <Plus size={16} /> Add Lesson
              </Button>
              <Button
                onClick={() => seedLessons.mutate()}
                disabled={seedLessons.isPending}
                variant="outline"
                className="rounded-xl gap-2 shadow-sm"
              >
                {seedLessons.isPending ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
                Seed 96
              </Button>
            </div>
          </div>

          {/* Lessons table */}
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Week</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Day</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Title</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Published</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessonsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-3"><Skeleton className="h-5 w-10" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-8" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-48" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-12 mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                      </tr>
                    ))
                  ) : filteredLessons.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        No lessons found. Click "Add Lesson" or "Seed 96" to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredLessons.map((lesson) => (
                      <tr key={lesson.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-foreground">W{lesson.weekNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">D{lesson.dayNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground truncate max-w-[300px]">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">{lesson.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={!!lesson.publishedAt}
                            onCheckedChange={(checked) => togglePublishMut.mutate({ id: lesson.id, publish: checked })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(lesson)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(lesson.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* LEADERBOARD TAB                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="leaderboard" className="space-y-6 mt-6">
          {/* Header block with search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-foreground">ポイント＆ストリーク監査ランキング</h2>
              <p className="text-sm text-muted-foreground mt-0.5">受講生のアクティビティ・エンゲージメントレベルを監査します</p>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                placeholder="受講生を検索..."
                className="pl-9 rounded-xl h-9 w-64 bg-background"
              />
            </div>
          </div>

          {/* Loading Skeleton */}
          {leaderboardLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto py-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="premium-card rounded-2xl p-6 text-center shadow-md space-y-4">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                    <Skeleton className="h-3 w-32 mx-auto" />
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Skeleton className="h-10 rounded-xl" />
                      <Skeleton className="h-10 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="premium-card rounded-2xl overflow-hidden">
                <div className="h-10 bg-muted/40 border-b border-border" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 border-b border-border flex items-center justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Podium Display (Hidden when search query is active to keep UI neat) */}
              {!leaderboardSearch && filteredLeaderboard.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto py-8">
                  {/* 2nd Place */}
                  {filteredLeaderboard[1] && (
                    <div className="order-2 md:order-1 premium-card border-slate-300/30 bg-gradient-to-b from-slate-500/[0.02] to-slate-500/[0.06] rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 relative group border-t-4 border-t-slate-400">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-400 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        2
                      </div>
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-4xl mb-2">🥈</span>
                        <div className="w-16 h-16 rounded-full pride-gradient flex items-center justify-center text-white text-xl font-bold shadow-inner group-hover:scale-105 transition-transform duration-300 mb-3 overflow-hidden">
                          {filteredLeaderboard[1].avatarUrl ? (
                            <img src={filteredLeaderboard[1].avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (filteredLeaderboard[1].name ?? "?").charAt(0).toUpperCase()
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-base text-foreground truncate max-w-full">{filteredLeaderboard[1].name ?? "—"}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-full mb-4">{filteredLeaderboard[1].email}</p>
                        
                        <div className="w-full h-px bg-border my-3" />
                        
                        <div className="grid grid-cols-2 gap-2 w-full text-left">
                          <div className="text-center bg-muted/30 p-2 rounded-xl">
                            <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-1">
                              <Star size={10} className="text-slate-400 fill-slate-400" /> Points
                            </div>
                            <div className="text-sm font-extrabold text-foreground mt-0.5">{filteredLeaderboard[1].totalPoints}</div>
                          </div>
                          <div className="text-center bg-muted/30 p-2 rounded-xl">
                            <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-0.5">
                              <Flame size={10} className={cn(filteredLeaderboard[1].streak > 0 ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} /> Streak
                            </div>
                            <div className="text-sm font-extrabold text-foreground mt-0.5">{filteredLeaderboard[1].streak}日</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {filteredLeaderboard[0] && (
                    <div className="order-1 md:order-2 premium-card border-amber-500/30 bg-gradient-to-b from-amber-500/[0.03] to-amber-500/[0.08] rounded-2xl p-7 text-center shadow-2xl hover:shadow-3xl transition-all duration-300 relative group md:scale-105 z-10 border-t-4 border-t-amber-500">
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-base shadow-lg animate-bounce">
                        1
                      </div>
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-5xl mb-2 animate-pulse">🥇</span>
                        <div className="w-20 h-20 rounded-full pride-gradient flex items-center justify-center text-white text-2xl font-bold shadow-inner ring-4 ring-amber-500/20 group-hover:scale-105 transition-transform duration-300 mb-3 relative overflow-hidden">
                          {filteredLeaderboard[0].avatarUrl ? (
                            <img src={filteredLeaderboard[0].avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (filteredLeaderboard[0].name ?? "?").charAt(0).toUpperCase()
                          )}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-background flex items-center justify-center text-white">
                            <Award size={12} className="fill-white" />
                          </div>
                        </div>
                        <h3 className="font-serif font-bold text-lg text-foreground truncate max-w-full">{filteredLeaderboard[0].name ?? "—"}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-full mb-4">{filteredLeaderboard[0].email}</p>
                        
                        <div className="w-full h-px bg-amber-500/10 my-3" />
                        
                        <div className="grid grid-cols-2 gap-2 w-full text-left">
                          <div className="text-center bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-1">
                              <Star size={10} className="text-amber-500 fill-amber-500 animate-pulse" /> Points
                            </div>
                            <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{filteredLeaderboard[0].totalPoints}</div>
                          </div>
                          <div className="text-center bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-0.5">
                              <Flame size={10} className="text-orange-500 fill-orange-500 animate-bounce" /> Streak
                            </div>
                            <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{filteredLeaderboard[0].streak}日</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {filteredLeaderboard[2] && (
                    <div className="order-3 md:order-3 premium-card border-amber-700/30 bg-gradient-to-b from-amber-700/[0.02] to-amber-700/[0.06] rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 relative group border-t-4 border-t-amber-700">
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        3
                      </div>
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-4xl mb-2">🥉</span>
                        <div className="w-16 h-16 rounded-full pride-gradient flex items-center justify-center text-white text-xl font-bold shadow-inner group-hover:scale-105 transition-transform duration-300 mb-3 overflow-hidden">
                          {filteredLeaderboard[2].avatarUrl ? (
                            <img src={filteredLeaderboard[2].avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (filteredLeaderboard[2].name ?? "?").charAt(0).toUpperCase()
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-base text-foreground truncate max-w-full">{filteredLeaderboard[2].name ?? "—"}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-full mb-4">{filteredLeaderboard[2].email}</p>
                        
                        <div className="w-full h-px bg-border my-3" />
                        
                        <div className="grid grid-cols-2 gap-2 w-full text-left">
                          <div className="text-center bg-muted/30 p-2 rounded-xl">
                            <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-1">
                              <Star size={10} className="text-amber-700 fill-amber-700" /> Points
                            </div>
                            <div className="text-sm font-extrabold text-foreground mt-0.5">{filteredLeaderboard[2].totalPoints}</div>
                          </div>
                          <div className="text-center bg-muted/30 p-2 rounded-xl">
                            <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-center gap-0.5">
                              <Flame size={10} className={cn(filteredLeaderboard[2].streak > 0 ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} /> Streak
                            </div>
                            <div className="text-sm font-extrabold text-foreground mt-0.5">{filteredLeaderboard[2].streak}日</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Leaderboard List Table */}
              <div className="premium-card rounded-2xl overflow-hidden mt-6 shadow-sm border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-center text-xs font-bold text-muted-foreground px-4 py-3.5 w-16">Rank</th>
                        <th className="text-left text-xs font-bold text-muted-foreground px-5 py-3.5">Member</th>
                        <th className="text-left text-xs font-bold text-muted-foreground px-5 py-3.5">Completed Lessons</th>
                        <th className="text-center text-xs font-bold text-muted-foreground px-4 py-3.5 w-32">Streak</th>
                        <th className="text-right text-xs font-bold text-muted-foreground px-5 py-3.5 w-32">Points</th>
                        <th className="text-left text-xs font-bold text-muted-foreground px-5 py-3.5 w-44">Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaderboard.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                            該当する受講生が見つかりません。
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboard.map((user, idx) => {
                          const rank = idx + 1;
                          const termProgressPercent = Math.min(100, Math.round(((user.completed ?? 0) / 288) * 100));

                          return (
                            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-3.5 text-center font-bold">
                                {rank === 1 ? (
                                  <span className="text-xl" title="1位">🥇</span>
                                ) : rank === 2 ? (
                                  <span className="text-xl" title="2位">🥈</span>
                                ) : rank === 3 ? (
                                  <span className="text-xl" title="3位">🥉</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">#{rank}</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full pride-gradient flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm overflow-hidden">
                                    {user.avatarUrl ? (
                                      <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      (user.name ?? "?").charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-sm font-bold text-foreground leading-none">{user.name ?? "—"}</p>
                                      {user.role === "admin" && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-900/60">
                                          Admin
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{user.email ?? "—"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="space-y-1.5 max-w-[200px]">
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-foreground">{user.completed ?? 0} / 288 lessons</span>
                                    <span className="text-muted-foreground">{termProgressPercent}%</span>
                                  </div>
                                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="absolute inset-y-0 left-0 pride-gradient rounded-full"
                                      style={{ width: `${termProgressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {user.streak > 0 ? (
                                  <div className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full text-xs font-bold border border-orange-200/50 dark:border-orange-900/30">
                                    <Flame size={12} className="fill-orange-500 text-orange-500 animate-pulse" />
                                    <span>{user.streak}日継続</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-medium">0日</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right font-extrabold text-sm text-foreground">
                                <div className="inline-flex items-center gap-1">
                                  <Star size={13} className="text-amber-500 fill-amber-500" />
                                  <span>{user.totalPoints} <span className="text-[10px] text-muted-foreground font-bold">pts</span></span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {user.milestones && user.milestones.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {user.milestones.slice(0, 3).map((m: any) => (
                                      <span
                                        key={m.id}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/20"
                                        title={m.badgeLabel}
                                      >
                                        {m.badgeLabel}
                                      </span>
                                    ))}
                                    {user.milestones.length > 3 && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                        +{user.milestones.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-medium">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Point History Line Chart Card */}
              <div className="premium-card rounded-2xl p-6 mt-6 border border-border shadow-sm bg-gradient-to-br from-background via-background to-primary/[0.01]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-foreground">学習アクティビティ推移 (Points Trend)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">直近7日間に各メンバーが獲得した日次ポイントの推移と全体週平均</p>
                  </div>
                  
                  {/* Interactive Member Toggle Checkboxes */}
                  {pointHistoryData && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">表示するメンバー:</span>
                      {pointHistoryData.members.map((m) => {
                        const isChecked = selectedChartMembers.includes(m.name);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setSelectedChartMembers(selectedChartMembers.filter((name) => name !== m.name));
                              } else {
                                setSelectedChartMembers([...selectedChartMembers, m.name]);
                              }
                            }}
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer select-none",
                              isChecked
                                ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
                                : "bg-background text-muted-foreground border-border hover:bg-muted/50"
                            )}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Line Chart Component */}
                {historyLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : (
                  <div className="h-72 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={pointHistoryData ? pointHistoryData.dates.map((date, idx) => {
                          const dataPoint: Record<string, any> = { date };
                          pointHistoryData.members.forEach((m) => {
                            dataPoint[m.name] = m.pointsByDate[date] || 0;
                          });
                          dataPoint["Weekly Average (週平均)"] = pointHistoryData.weeklyAverage[date] || 0;
                          return dataPoint;
                        }) : []}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="date" tickLine={false} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.9)",
                            borderColor: "rgba(0,0,0,0.1)",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "15px" }} />
                        
                        {/* Static/Dynamic Lines */}
                        {pointHistoryData?.members
                          .filter((m) => selectedChartMembers.includes(m.name))
                          .map((m, idx) => {
                            const colors = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];
                            const color = colors[idx % colors.length];
                            return (
                              <Line
                                key={m.id}
                                type="monotone"
                                dataKey={m.name}
                                stroke={color}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            );
                          })}
                        
                        {/* Global Weekly Average line */}
                        <Line
                          type="monotone"
                          dataKey="Weekly Average (週平均)"
                          stroke="#ec4899"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* BROADCAST TAB                                                         */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">全体お知らせプッシュ機能 (Broadcast)</h2>
            <p className="text-sm text-muted-foreground mt-0.5">PLEアカデミーの全受講生（管理者を除く）に、リアルタイムでお知らせを配信します</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
              {editingBroadcast && (
                <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold text-primary animate-fade-in shadow-xs">
                  <span className="flex items-center gap-1.5">
                    ✏️ 現在『{editingBroadcast.oldTitle}』を編集して再送信するモードです。
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyTitle("");
                      setNotifyMessage("");
                      setNotifyType("general");
                      setConfirmSend(false);
                      setEditingBroadcast(null);
                    }}
                    className="text-muted-foreground hover:text-foreground text-[10px] font-bold px-2 py-1 rounded bg-muted/40 hover:bg-muted/80 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}

              <div className="premium-card rounded-2xl p-6 space-y-4 border border-border shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="notify-title" className="text-xs font-bold text-foreground">お知らせタイトル (Title) *</Label>
                  <Input
                    id="notify-title"
                    value={notifyTitle}
                    onChange={(e) => setNotifyTitle(e.target.value)}
                    placeholder="例: 【お知らせ】第1期（Term 1）修了バッジの贈呈について"
                    maxLength={100}
                    className="rounded-xl border border-input focus-visible:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{notifyTitle.length}/100文字</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notify-message" className="text-xs font-bold text-foreground">お知らせ本文 (Message Body) *</Label>
                  <Textarea
                    id="notify-message"
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="受講生のベル通知ドロワーに表示される詳細テキストを記入してください。改行もそのまま保存されます。"
                    rows={6}
                    maxLength={1000}
                    className="rounded-xl border border-input focus-visible:ring-primary min-h-[120px]"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{notifyMessage.length}/1000文字</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">お知らせのカテゴリー (Category)</Label>
                    <Select
                      value={notifyType}
                      onValueChange={(val: any) => setNotifyType(val)}
                    >
                      <SelectTrigger className="rounded-xl border border-input h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">📢 一般告知 (General Info)</SelectItem>
                        <SelectItem value="new_lesson">📚 新規レッスン公開 (Curriculum)</SelectItem>
                        <SelectItem value="login_bonus">🔥 ストリーク・継続ボーナス (Activity)</SelectItem>
                        <SelectItem value="payment_failed">⚠️ アカウント・決済関連 (Alert)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="w-full h-px bg-border my-2" />

                {/* Safety Checkbox */}
                <div className="flex items-start gap-3 bg-destructive/5 dark:bg-destructive/10 p-3.5 rounded-xl border border-destructive/20 transition-all duration-200">
                  <input
                    type="checkbox"
                    id="confirm-send-box"
                    checked={confirmSend}
                    onChange={(e) => setConfirmSend(e.target.checked)}
                    className="mt-1 h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <Label htmlFor="confirm-send-box" className="cursor-pointer text-[11px] font-bold text-destructive leading-relaxed select-none">
                    【配信確認】送信ボタンを押すと、全受講生のアカウントに即時プッシュ通知が発行されます。送信後の取り消しはできないことを確認しました。
                  </Label>
                </div>

                {/* Send Button */}
                <Button
                  onClick={() => {
                    if (editingBroadcast) {
                      updateBroadcastMut.mutate({
                        oldTitle: editingBroadcast.oldTitle,
                        oldMessage: editingBroadcast.oldMessage,
                        oldType: editingBroadcast.oldType as any,
                        newTitle: notifyTitle,
                        newMessage: notifyMessage,
                        newType: notifyType as any
                      });
                    } else {
                      sendGlobalNotificationMut.mutate({
                        title: notifyTitle,
                        message: notifyMessage,
                        type: notifyType as any
                      });
                    }
                  }}
                  disabled={
                    !notifyTitle.trim() ||
                    !notifyMessage.trim() ||
                    !confirmSend ||
                    (editingBroadcast ? updateBroadcastMut.isPending : sendGlobalNotificationMut.isPending)
                  }
                  className="w-full rounded-xl pride-gradient text-white h-11 text-sm font-bold gap-2 shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.99] transition-all duration-150"
                >
                  {editingBroadcast ? (
                    updateBroadcastMut.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        更新中...
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        お知らせを更新して再送信する
                      </>
                    )
                  ) : (
                    sendGlobalNotificationMut.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        お知らせを配信中...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        全体へお知らせを一斉配信する
                      </>
                    )
                  )}
                </Button>
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground px-1">
                <Eye size={13} className="text-primary animate-pulse" />
                <span>受講生画面での表示プレビュー (Live Push Preview)</span>
              </div>

              {/* Push Notification Drawer Mock */}
              <div className="premium-card rounded-2xl p-5 border border-primary/10 bg-gradient-to-br from-background via-background to-primary/[0.01] shadow-lg max-w-sm mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-extrabold text-foreground">通知ドロワー (Notifications)</span>
                  </div>
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">新着 1 件</span>
                </div>

                {/* Real-time reactive notification card */}
                <div className="p-3.5 rounded-xl border border-border bg-background shadow-sm hover:border-primary/20 transition-all duration-300 flex items-start gap-3">
                  {/* Matching Dynamic Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner",
                    notifyType === "general" && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
                    notifyType === "new_lesson" && "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
                    notifyType === "login_bonus" && "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400",
                    notifyType === "payment_failed" && "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                  )}>
                    {notifyType === "general" && <Bell size={16} className="fill-blue-500/10" />}
                    {notifyType === "new_lesson" && <BookOpen size={16} />}
                    {notifyType === "login_bonus" && <Flame size={16} className="fill-orange-500/10" />}
                    {notifyType === "payment_failed" && <AlertTriangle size={16} />}
                  </div>

                  <div className="flex-1 space-y-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        "text-xs font-extrabold truncate",
                        notifyTitle.trim() ? "text-foreground" : "text-muted-foreground/60 italic"
                      )}>
                        {notifyTitle.trim() ? notifyTitle : "お知らせタイトルがここに表示されます"}
                      </h4>
                      <span className="text-[9px] text-muted-foreground shrink-0 font-medium mt-0.5">たった今</span>
                    </div>
                    <p className={cn(
                      "text-[10px] leading-normal whitespace-pre-wrap break-words",
                      notifyMessage.trim() ? "text-muted-foreground font-medium" : "text-muted-foreground/40 italic font-normal"
                    )}>
                      {notifyMessage.trim() ? notifyMessage : "お知らせ本文がここに表示されます。カテゴリー切り替えによって、左側のアバター色とアイコンが動的に変化します。"}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className={cn(
                        "text-[9px] font-extrabold px-1.5 py-0.5 rounded",
                        notifyType === "general" && "bg-blue-100/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
                        notifyType === "new_lesson" && "bg-green-100/50 dark:bg-green-950/20 text-green-700 dark:text-green-300",
                        notifyType === "login_bonus" && "bg-orange-100/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
                        notifyType === "payment_failed" && "bg-red-100/50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                      )}>
                        {notifyType === "general" && "一般お知らせ"}
                        {notifyType === "new_lesson" && "新規レッスン"}
                        {notifyType === "login_bonus" && "アクティビティ"}
                        {notifyType === "payment_failed" && "重要アラート"}
                      </span>
                      <span className="text-[9px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                        詳細を見る <span className="text-[8px] font-normal">→</span>
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-center text-muted-foreground/60 font-medium">
                  プレビューは受講生のデスクトップおよびモバイルの標準表示サイズに対応しています。
                </p>
              </div>
            </div>
          </div>

          {/* Sent Broadcast History Section */}
          <div className="premium-card rounded-2xl p-6 border border-border shadow-sm mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-primary" />
              <h3 className="font-serif text-lg font-bold text-foreground">配信履歴一覧 (Sent Broadcast History)</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-bold text-muted-foreground px-4 py-3">配信日時 (Date)</th>
                    <th className="text-left text-xs font-bold text-muted-foreground px-4 py-3">カテゴリー (Type)</th>
                    <th className="text-left text-xs font-bold text-muted-foreground px-4 py-3">タイトル (Title)</th>
                    <th className="text-left text-xs font-bold text-muted-foreground px-4 py-3">メッセージ内容 (Message)</th>
                    <th className="text-center text-xs font-bold text-muted-foreground px-4 py-3 w-32">操作 (Actions)</th>
                  </tr>
                </thead>
                <tbody>
                  {!sentBroadcasts || sentBroadcasts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground font-medium">
                        配信履歴はありません
                      </td>
                    </tr>
                  ) : (
                    sentBroadcasts.map((b, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                          {b.createdAt ? new Date(b.createdAt).toLocaleString("ja-JP", { hour12: false }) : "不明"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap",
                            b.type === "general" && "bg-blue-100/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
                            b.type === "new_lesson" && "bg-green-100/50 dark:bg-green-950/20 text-green-700 dark:text-green-300",
                            b.type === "login_bonus" && "bg-orange-100/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
                            b.type === "payment_failed" && "bg-red-100/50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                          )}>
                            {b.type === "general" && "一般"}
                            {b.type === "new_lesson" && "新規レッスン"}
                            {b.type === "login_bonus" && "アクティビティ"}
                            {b.type === "payment_failed" && "アラート"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-foreground truncate max-w-[180px]" title={b.title}>
                          {b.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[300px]" title={b.message}>
                          {b.message}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditingBroadcast({
                                  oldTitle: b.title,
                                  oldMessage: b.message,
                                  oldType: b.type
                                });
                                setNotifyTitle(b.title);
                                setNotifyMessage(b.message);
                                setNotifyType(b.type as any);
                                setConfirmSend(true); // Auto-confirm when editing to make it smoother
                                // Scroll up to the notification tab form section
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              title="編集して再投稿"
                            >
                              <Pencil size={13} className="text-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`「${b.title}」を削除してもよろしいですか？（※全受講生の通知ドロワーから消去されます）`)) {
                                  deleteBroadcastMut.mutate({
                                    title: b.title,
                                    message: b.message,
                                    type: b.type
                                  });
                                }
                              }}
                              title="削除"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Member Progress Dialog                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedUser} onOpenChange={(o) => { if (!o) setSelectedUser(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Member Progress</DialogTitle>
          </DialogHeader>
          {memberProgress ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-foreground">{memberProgress.completed}</div>
                  <div className="text-xs text-muted-foreground">Lessons Done</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-foreground">{memberProgress.totalPoints}</div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-foreground">{memberProgress.streak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <div className="text-2xl font-bold text-foreground">{memberProgress.milestones?.length ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 pride-gradient rounded-full"
                  style={{ width: `${Math.round(((memberProgress.completed ?? 0) / 96) * 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(((memberProgress.completed ?? 0) / 96) * 100)}% of course complete
              </p>
              {memberProgress.milestones && memberProgress.milestones.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {memberProgress.milestones.map((m: any) => (
                    <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {m.badgeLabel}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 size={24} className="animate-spin mx-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Lesson Create/Edit Dialog                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* 📘 Admin Guide (How to Use) Dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl border-primary/10">
          <DialogHeader className="pb-3 border-b border-border/40 shrink-0">
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-foreground">
              <HelpCircle className="text-primary animate-pulse" />
              管理者パネル 使い方ガイド (Admin Guide)
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              このガイドは管理者パネルの基本操作とPLE（Pride Life English）アカデミーの運用ルールを説明します。管理機能のアップデートに合わせてこの内容も自動更新されます。
            </p>

            <div className="space-y-4">
              {ADMIN_GUIDE_SECTIONS.map((section, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    {section.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {section.desc}
                  </p>
                  <ul className="space-y-2 text-xs text-muted-foreground/90 pl-1 list-none">
                    {section.steps.map((step, sIdx) => {
                      const [highlight, ...rest] = step.split(":");
                      return (
                        <li key={sIdx} className="leading-relaxed flex items-start gap-1.5">
                          <span className="text-primary mt-1 shrink-0">•</span>
                          <span>
                            <strong className="text-foreground">{highlight}:</strong>
                            {rest.join(":")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 shrink-0">
            <Button onClick={() => setGuideOpen(false)} className="rounded-xl w-full sm:w-auto">
              ガイドを閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Lesson Create/Edit Dialog                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent
          className={cn(
            "rounded-2xl flex flex-col transition-all duration-300 shadow-2xl border-primary/10",
            isMaximized
              ? "w-[95vw] sm:max-w-[95vw] h-[90vh] sm:max-h-[90vh] max-h-[95vh] p-6"
              : "sm:max-w-lg max-h-[90vh] p-6"
          )}
          style={{
            resize: isMaximized ? "none" : "both",
            minWidth: isMaximized ? "none" : "480px",
            minHeight: isMaximized ? "none" : "400px",
            overflow: "hidden", // We use inner flex scroll
          }}
        >
          {/* Maximize Toggle Button placed perfectly in the header */}
          <div className="absolute right-12 top-4 flex items-center gap-1.5 z-50">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors border border-border/40 bg-background/50 backdrop-blur-sm"
              title={isMaximized ? "縮小する" : "最大化する"}
            >
              {isMaximized ? (
                <span className="text-[10px] font-bold px-1 py-0.5 leading-none">❐ 縮小</span>
              ) : (
                <span className="text-[10px] font-bold px-1 py-0.5 leading-none">⛶ 最大化</span>
              )}
            </button>
          </div>

          <DialogHeader className="shrink-0 pb-2 border-b border-border/20">
            <DialogTitle className="font-serif text-xl text-foreground">
              {editingLessonId ? "Edit Lesson" : "Create New Lesson"}
            </DialogTitle>
          </DialogHeader>

          {/* Form Content is 100% scrollable when overflowing */}
          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week (1-72)</Label>
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={form.weekNumber}
                  onChange={(e) => setForm({ ...form, weekNumber: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Day (1-4)</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={form.dayNumber}
                  onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Week 25 Day 1: Advanced Business English with Pride"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief lesson description..."
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://youtube.com/embed/..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Journaling Prompt</Label>
              <Textarea
                value={form.journalingPrompt}
                onChange={(e) => setForm({ ...form, journalingPrompt: e.target.value })}
                placeholder="How would you describe your goals for this term?"
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Speaking Prompt</Label>
              <Textarea
                value={form.speakingPrompt}
                onChange={(e) => setForm({ ...form, speakingPrompt: e.target.value })}
                placeholder='Practice saying: "In this term, I plan to..."'
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={form.publish}
                onCheckedChange={(checked) => setForm({ ...form, publish: checked })}
              />
              <Label className="cursor-pointer text-xs font-semibold text-muted-foreground select-none">Publish immediately (受講生に即時公開する)</Label>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border/20 mt-2">
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveLesson} disabled={isSaving} className="rounded-xl gap-2 shadow-sm">
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editingLessonId ? "Save Changes" : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Delete Confirmation Dialog                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete Lesson?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The lesson and all associated content will be permanently removed.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteLessonMut.mutate({ id: deleteConfirmId })}
              disabled={deleteLessonMut.isPending}
              className="rounded-xl gap-2"
            >
              {deleteLessonMut.isPending && <Loader2 size={16} className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

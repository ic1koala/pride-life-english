import { trpc } from "@/lib/trpc";
import { useState } from "react";
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
  Shield, Users, Search, TrendingUp, CheckCircle2, Loader2, BookOpen,
  Plus, Pencil, Trash2, Eye, EyeOff, HelpCircle,
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

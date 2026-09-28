import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Milestone,
  Target,
  Sparkles,
  HelpCircle,
  ChevronRight,
  Layers,
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Award,
  BookOpen,
  Send,
  Database,
  Flame,
  Check,
  Edit3,
} from "lucide-react";

export type TaskStatus = "completed" | "in_progress" | "in_review" | "not_started";
export type TaskPriority = "high" | "medium" | "low";

export interface RoadmapTask {
  id: string;
  stepId: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  progress: number;
}

export interface RoadmapStep {
  id: number;
  stepNumber: string;
  title: string;
  subtitle: string;
  targetDate: string;
  badge: string;
  description: string;
}

const DEFAULT_STEPS: RoadmapStep[] = [
  {
    id: 1,
    stepNumber: "Step 01",
    title: "基盤設計・認証・決済インフラ確立",
    subtitle: "Architecture & Infrastructure",
    targetDate: "2026年4月中旬",
    badge: "基盤完了",
    description: "MySQL/TiDBスキーマ策定、メール/パスワード認証、Stripeサブスクリプション決済、会員保護ルーティングの構築。",
  },
  {
    id: 2,
    stepNumber: "Step 02",
    title: "カリキュラム基盤・レッスン学習コア機能",
    subtitle: "Core Curriculum & AI Practice",
    targetDate: "2026年5月上旬",
    badge: "学習基盤完了",
    description: "全72週・288レッスンの3ターム制カリキュラム、音読WPM計測、Whisper音声文字起こし、LLM個別フィードバック。",
  },
  {
    id: 3,
    stepNumber: "Step 03",
    title: "受講生エンゲージメント・継続支援メカニズム",
    subtitle: "Engagement & Retention",
    targetDate: "2026年5月中旬",
    badge: "体験統合完了",
    description: "暖色サンライズUI、ログインボーナス＆スタンプ、ストリーク保護「Streak Freeze」、Q&Aコミュニティ基盤。",
  },
  {
    id: 4,
    stepNumber: "Step 04",
    title: "管理者CMSプラットフォーム・全体配信システム",
    subtitle: "Admin Operations & CMS",
    targetDate: "2026年6月上旬",
    badge: "運用機能完了",
    description: "受講生監査、ターム別レッスンCRUD、お知らせ＆スレッドCMS、一斉プッシュ通知（編集・再送信・削除対応）。",
  },
  {
    id: 5,
    stepNumber: "Step 05",
    title: "統合テスト・本番DB物理マイグレーション・品質監査",
    subtitle: "Quality Assurance & DB Migration",
    targetDate: "2026年9月下旬",
    badge: "品質監査通過",
    description: "TypeScript厳格型検査（エラー0）、全26件の自動単体テスト通過、TiDB CloudへのDDL直接適用、モバイル最適化。",
  },
  {
    id: 6,
    stepNumber: "Step 06",
    title: "リリース準備・運用体制確立・最終ローンチ",
    subtitle: "Final Launch & Maintenance",
    targetDate: "2026年10月上旬",
    badge: "最終段階",
    description: "Render自動デプロイ結合、本番実機検証、運用仕様書＆監視プロトコル策定、受講生の正式受け入れ開始。",
  },
];

const INITIAL_TASKS: RoadmapTask[] = [
  // Step 1
  {
    id: "task-1-1",
    stepId: 1,
    title: "Drizzle ORM & データベース初期スキーマ設計",
    description: "users, progress, subscriptions, notifications テーブル定義",
    status: "completed",
    priority: "high",
    assignee: "リードエンジニア",
    dueDate: "2026-04-10",
    progress: 100,
  },
  {
    id: "task-1-2",
    stepId: 1,
    title: "Stripeサブスクリプション決済＆Webhook連携",
    description: "決済成功/失敗時のステータス同期、カスタマーポータル連携",
    status: "completed",
    priority: "high",
    assignee: "決済担当",
    dueDate: "2026-04-15",
    progress: 100,
  },
  {
    id: "task-1-3",
    stepId: 1,
    title: "会員権限ガード＆JWTセッション保護ルーティング",
    description: "受講生限定ページおよび管理者パネルへのアクセス制御",
    status: "completed",
    priority: "high",
    assignee: "セキュリティ担当",
    dueDate: "2026-04-18",
    progress: 100,
  },

  // Step 2
  {
    id: "task-2-1",
    stepId: 2,
    title: "1年間3ターム制（全72週・288レッスン）データシード",
    description: "週4日構成、テーマ別テキストブック構造の策定とDB格納",
    status: "completed",
    priority: "high",
    assignee: "カリキュラム統括",
    dueDate: "2026-05-02",
    progress: 100,
  },
  {
    id: "task-2-2",
    stepId: 2,
    title: "音読録音・Whisper文字起こし・AIコーチング機能",
    description: "ブラウザ音声キャプチャ、WPM計測、LLMによる共感型フィードバック",
    status: "completed",
    priority: "high",
    assignee: "AI・フロントエンド担当",
    dueDate: "2026-05-08",
    progress: 100,
  },
  {
    id: "task-2-3",
    stepId: 2,
    title: "マイルストーンバッジ自動贈呈ロジック",
    description: "Term 1(96完了), Term 2(192完了), Complete, Masterバッジ付与",
    status: "completed",
    priority: "medium",
    assignee: "バックエンド担当",
    dueDate: "2026-05-10",
    progress: 100,
  },

  // Step 3
  {
    id: "task-3-1",
    stepId: 3,
    title: "暖色サンライズテーマUI＆モバイル底部タブナビゲーション",
    description: "Pride-lifeカラー、レスポンシブなカードデザインの全面刷新",
    status: "completed",
    priority: "high",
    assignee: "UIデザイナー / フロント",
    dueDate: "2026-05-15",
    progress: 100,
  },
  {
    id: "task-3-2",
    stepId: 3,
    title: "ログインボーナス・連続ストリーク演出・保護システム",
    description: "日次スタンプ、500ptで購入可能な「Streak Freeze」自動消費",
    status: "completed",
    priority: "high",
    assignee: "フロント・バックエンド",
    dueDate: "2026-05-20",
    progress: 100,
  },
  {
    id: "task-3-3",
    stepId: 3,
    title: "Q&Aコミュニティ機能（質問・ベストアンサー・いいね）",
    description: "受講生同士および講師とのインタラクティブな質疑応答基盤",
    status: "completed",
    priority: "medium",
    assignee: "フロントエンド担当",
    dueDate: "2026-05-25",
    progress: 100,
  },

  // Step 4
  {
    id: "task-4-1",
    stepId: 4,
    title: "管理者パネル：受講生監査・ステータス管理・進捗モーダル",
    description: "会員ステータス即時切替、累積ポイント＆完了レッスン数可視化",
    status: "completed",
    priority: "high",
    assignee: "管理機能担当",
    dueDate: "2026-06-01",
    progress: 100,
  },
  {
    id: "task-4-2",
    stepId: 4,
    title: "ダッシュボード「お知らせ＆スレッド」カード＋管理者CMSタブ",
    description: "未読♦・新着NEWバッジ・Markdown/画像/動画リッチメディア・CRUD管理",
    status: "completed",
    priority: "high",
    assignee: "フロント・バックエンド",
    dueDate: "2026-06-02",
    progress: 100,
  },
  {
    id: "task-4-3",
    stepId: 4,
    title: "全体お知らせ一斉配信（プッシュ通知、編集、再送信、削除）",
    description: "ベル通知ドロワーへのリアルタイム反映、送信前プレビュー機能",
    status: "completed",
    priority: "medium",
    assignee: "バックエンド担当",
    dueDate: "2026-06-05",
    progress: 100,
  },
  {
    id: "task-4-4",
    stepId: 4,
    title: "監査ランキングポディウム＆ポイント推移マルチラインチャート",
    description: "Recharts製週平均ベンチマーク点線、受講生別表示トグル",
    status: "completed",
    priority: "medium",
    assignee: "フロントエンド担当",
    dueDate: "2026-06-08",
    progress: 100,
  },

  // Step 5
  {
    id: "task-5-1",
    stepId: 5,
    title: "TypeScript厳格型チェック & 自動ユニットテスト26件パス",
    description: "tsc --noEmit エラー0件、全主要機能の単体テスト網羅",
    status: "completed",
    priority: "high",
    assignee: "QA・リードエンジニア",
    dueDate: "2026-09-25",
    progress: 100,
  },
  {
    id: "task-5-2",
    stepId: 5,
    title: "TiDB Cloud本番MySQLへの物理マイグレーション直接適用",
    description: "courseNews, threads, courseNewsReads, threadReads テーブル作成完了",
    status: "completed",
    priority: "high",
    assignee: "DB・インフラ担当",
    dueDate: "2026-09-28",
    progress: 100,
  },
  {
    id: "task-5-3",
    stepId: 5,
    title: "Render本番Webサービスの自動ビルド＆自動デプロイ結合検証",
    description: "GitHub mainブランチプッシュ連動、本番ビルド通過確認",
    status: "completed",
    priority: "high",
    assignee: "インフラ担当",
    dueDate: "2026-09-28",
    progress: 100,
  },

  // Step 6
  {
    id: "task-6-1",
    stepId: 6,
    title: "進捗管理ロードマップアプリ＆運用仕様書（PDF対応）の策定",
    description: "To Do管理ダッシュボード、仕様書タブ、印刷用PDF出力機能の実装",
    status: "in_progress",
    priority: "high",
    assignee: "総括担当 (Lead)",
    dueDate: "2026-09-29",
    progress: 85,
  },
  {
    id: "task-6-2",
    stepId: 6,
    title: "本番実機エンドツーエンド動作検証（受講生・管理者シナリオ）",
    description: "受講登録、決済、音読レッスン、お知らせ既読判定の最終テスト",
    status: "not_started",
    priority: "high",
    assignee: "QA・総括担当",
    dueDate: "2026-10-02",
    progress: 0,
  },
  {
    id: "task-6-3",
    stepId: 6,
    title: "正式ローンチ判定会議 & 受講生アナウンス公開",
    description: "リリース判定ゲートクリアの最終確認、サービス本格オープン",
    status: "not_started",
    priority: "high",
    assignee: "プロジェクトオーナー・総括担当",
    dueDate: "2026-10-05",
    progress: 0,
  },
];

const LOCAL_STORAGE_KEY = "so_english_roadmap_tasks_v1";

export default function RoadmapApp() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "specs">("dashboard");
  const [tasks, setTasks] = useState<RoadmapTask[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load roadmap tasks from localStorage", e);
    }
    return INITIAL_TASKS;
  });

  const [selectedStepFilter, setSelectedStepFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states for task add / edit
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormStepId, setTaskFormStepId] = useState<number>(1);
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormDescription, setTaskFormDescription] = useState("");
  const [taskFormStatus, setTaskFormStatus] = useState<TaskStatus>("not_started");
  const [taskFormPriority, setTaskFormPriority] = useState<TaskPriority>("medium");
  const [taskFormAssignee, setTaskFormAssignee] = useState("");
  const [taskFormDueDate, setTaskFormDueDate] = useState("");

  // Print Mode state
  const [printOptionOpen, setPrintOptionOpen] = useState(false);

  // Save to local storage on changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn("Failed to save roadmap tasks to localStorage", e);
    }
  }, [tasks]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const notStarted = tasks.filter((t) => t.status === "not_started").length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, inReview, notStarted, percentage };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchStep = selectedStepFilter === "all" || task.stepId === Number(selectedStepFilter);
      const matchStatus = selectedStatusFilter === "all" || task.status === selectedStatusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStep && matchStatus && matchSearch;
    });
  }, [tasks, selectedStepFilter, selectedStatusFilter, searchQuery]);

  // Status toggle handler
  const handleCycleStatus = (taskId: string) => {
    const cycleMap: Record<TaskStatus, TaskStatus> = {
      not_started: "in_progress",
      in_progress: "in_review",
      in_review: "completed",
      completed: "not_started",
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = cycleMap[t.status];
          return {
            ...t,
            status: nextStatus,
            progress: nextStatus === "completed" ? 100 : nextStatus === "in_progress" ? 50 : nextStatus === "in_review" ? 85 : 0,
          };
        }
        return t;
      })
    );
  };

  // Open task create dialog
  const openCreateDialog = (stepId?: number) => {
    setEditingTaskId(null);
    setTaskFormStepId(stepId ?? 1);
    setTaskFormTitle("");
    setTaskFormDescription("");
    setTaskFormStatus("not_started");
    setTaskFormPriority("medium");
    setTaskFormAssignee("担当者");
    setTaskFormDueDate(new Date().toISOString().split("T")[0]);
    setIsTaskDialogOpen(true);
  };

  // Open task edit dialog
  const openEditDialog = (task: RoadmapTask) => {
    setEditingTaskId(task.id);
    setTaskFormStepId(task.stepId);
    setTaskFormTitle(task.title);
    setTaskFormDescription(task.description);
    setTaskFormStatus(task.status);
    setTaskFormPriority(task.priority);
    setTaskFormAssignee(task.assignee);
    setTaskFormDueDate(task.dueDate);
    setIsTaskDialogOpen(true);
  };

  // Save task
  const handleSaveTask = () => {
    if (!taskFormTitle.trim()) {
      toast.error("タスク名は必須です");
      return;
    }

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                stepId: taskFormStepId,
                title: taskFormTitle,
                description: taskFormDescription,
                status: taskFormStatus,
                priority: taskFormPriority,
                assignee: taskFormAssignee,
                dueDate: taskFormDueDate,
                progress: taskFormStatus === "completed" ? 100 : taskFormStatus === "in_review" ? 85 : taskFormStatus === "in_progress" ? 50 : 0,
              }
            : t
        )
      );
      toast.success("タスクを更新しました！");
    } else {
      const newTask: RoadmapTask = {
        id: `task-${Date.now()}`,
        stepId: taskFormStepId,
        title: taskFormTitle,
        description: taskFormDescription,
        status: taskFormStatus,
        priority: taskFormPriority,
        assignee: taskFormAssignee || "担当者",
        dueDate: taskFormDueDate || new Date().toISOString().split("T")[0],
        progress: taskFormStatus === "completed" ? 100 : taskFormStatus === "in_review" ? 85 : taskFormStatus === "in_progress" ? 50 : 0,
      };
      setTasks((prev) => [...prev, newTask]);
      toast.success("新規タスクを追加しました！");
    }
    setIsTaskDialogOpen(false);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    if (confirm("このタスクを削除してもよろしいですか？")) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("タスクを削除しました。");
    }
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (confirm("タスクを初期マスターデータに戻しますか？（現在の編集内容は上書きされます）")) {
      setTasks(INITIAL_TASKS);
      toast.success("初期マスターデータにリセットしました。");
    }
  };

  // Print PDF Trigger
  const handleTriggerPrint = (mode: "current" | "dashboard" | "specs" | "all") => {
    setPrintOptionOpen(false);

    if (mode === "dashboard") {
      setActiveTab("dashboard");
    } else if (mode === "specs") {
      setActiveTab("specs");
    }

    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-foreground pb-16 font-sans">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER SECTION (with Print Hide)                                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="rounded-xl gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft size={14} />
                ダッシュボードへ戻る
              </Button>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl pride-gradient flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
                <Target size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    SO ENGLISH! リリースロードマップ
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
                    総括ダッシュボード
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  ステップ別To Do進捗管理 ＆ 運用仕様書システム
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPrintOptionOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 font-bold text-xs shadow-xs border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
            >
              <Printer size={14} />
              <span>PDF書き出し</span>
            </Button>
            <Button
              onClick={() => openCreateDialog()}
              size="sm"
              className="rounded-xl pride-gradient text-white font-bold text-xs gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">タスク追加</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PRINT COVER / HEADER (Visible ONLY during print)                       */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-serif">SO ENGLISH! (Pride Life English)</h1>
            <p className="text-sm text-slate-600 mt-1">リリースロードマップ・ステップ別To Do進捗報告書 ＆ 運用仕様書</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p><strong>出力日:</strong> {new Date().toLocaleDateString("ja-JP")}</p>
            <p><strong>プロジェクト管理:</strong> 総括担当 (Lead Architect)</p>
            <p><strong>総合進捗率:</strong> {stats.percentage}% 達成</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-200/80 pb-3">
            <TabsList className="bg-slate-200/70 p-1 rounded-xl shadow-inner">
              <TabsTrigger value="dashboard" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <BarChart3 size={15} />
                <span>進捗管理ダッシュボード</span>
              </TabsTrigger>
              <TabsTrigger value="specs" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText size={15} />
                <span>運用仕様書 ＆ ルール定義</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToDefault}
                className="text-[11px] text-muted-foreground hover:text-foreground gap-1 h-8 rounded-lg"
                title="初期状態のマスターデータに戻す"
              >
                <RotateCcw size={12} />
                マスターリセット
              </Button>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DASHBOARD & ROADMAP                                          */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="dashboard" className="space-y-6 mt-6 focus-visible:outline-none">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 page-break-inside-avoid">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
                  <div className="w-7 h-7 rounded-lg pride-gradient flex items-center justify-center text-white text-xs font-bold">
                    %
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats.percentage}%
                  </div>
                  <div className="mt-2.5">
                    <Progress value={stats.percentage} className="h-2 rounded-full" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                    {stats.completed} / {stats.total} タスク完了
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                    {stats.completed}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">合格・デプロイ完了済</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
                  <Clock size={18} className="text-blue-500 animate-spin-slow" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight">
                    {stats.inProgress}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">現在実装・作業中</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">In Review</span>
                  <AlertCircle size={18} className="text-amber-500" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
                    {stats.inReview}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">監査・検証待ち</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Not Started</span>
                  <Milestone size={18} className="text-slate-400" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-600 tracking-tight">
                    {stats.notStarted}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">次期フェーズ待機</p>
                </div>
              </div>
            </div>

            {/* Release Gate Roadmap Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 page-break-inside-avoid">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Release Roadmap Schedule</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                    SO ENGLISH! 本格サービスインまでのマイルストーン
                  </h2>
                  <p className="text-xs text-slate-300">
                    現在の進捗ステータス: <span className="text-emerald-400 font-bold">Step 05 完了 ➡️ Step 06 (最終ローンチ検証) 進行中</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-300 font-medium">目標ローンチ予定</p>
                    <p className="text-base font-bold text-white">2026年10月上旬</p>
                  </div>
                  <div className="h-7 w-px bg-white/20" />
                  <div className="text-center">
                    <p className="text-[10px] text-slate-300 font-medium">健康度チェック</p>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      オンタイム (順調)
                    </span>
                  </div>
                </div>
              </div>

              {/* Step Flow Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-6 mt-4 border-t border-white/10">
                {DEFAULT_STEPS.map((step) => {
                  const stepTasks = tasks.filter((t) => t.stepId === step.id);
                  const isDone = stepTasks.length > 0 && stepTasks.every((t) => t.status === "completed");
                  const hasInProgress = stepTasks.some((t) => t.status === "in_progress" || t.status === "in_review");

                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedStepFilter(step.id.toString())}
                      className={cn(
                        "p-2.5 rounded-xl border cursor-pointer transition-all duration-200 text-left",
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60"
                          : hasInProgress
                            ? "bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/30"
                            : "bg-white/5 border-white/10 opacity-70 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400">{step.stepNumber}</span>
                        {isDone ? (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        ) : hasInProgress ? (
                          <span className="text-[9px] font-bold text-blue-300 px-1 py-0.2 bg-blue-500/30 rounded">進行中</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">未着手</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate" title={step.title}>
                        {step.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.targetDate}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter and Control Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-2">
                {/* Step Filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Layers size={14} className="text-primary" />
                  <span>ステップ:</span>
                </div>
                <Select value={selectedStepFilter} onValueChange={setSelectedStepFilter}>
                  <SelectTrigger className="w-44 h-8 text-xs rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="ステップを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのステップ (全6段階)</SelectItem>
                    {DEFAULT_STEPS.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.stepNumber}: {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 ml-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>状態:</span>
                </div>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての状態</SelectItem>
                    <SelectItem value="completed">完了 (Done)</SelectItem>
                    <SelectItem value="in_progress">進行中 (In Progress)</SelectItem>
                    <SelectItem value="in_review">レビュー中 (In Review)</SelectItem>
                    <SelectItem value="not_started">未着手 (Not Started)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="タスク・担当者を検索..."
                  className="h-8 w-full md:w-60 text-xs rounded-xl pl-3 pr-3 bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Steps & Task Board List */}
            <div className="space-y-6">
              {DEFAULT_STEPS.map((step) => {
                const stepTasks = filteredTasks.filter((t) => t.stepId === step.id);
                if (selectedStepFilter !== "all" && step.id !== Number(selectedStepFilter)) {
                  return null;
                }

                const totalStepTasks = tasks.filter((t) => t.stepId === step.id).length;
                const completedStepTasks = tasks.filter((t) => t.stepId === step.id && t.status === "completed").length;
                const isStepComplete = totalStepTasks > 0 && completedStepTasks === totalStepTasks;

                return (
                  <div key={step.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden page-break-inside-avoid">
                    {/* Step Card Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md pride-gradient text-white shadow-xs">
                            {step.stepNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-500 font-mono">[{step.subtitle}]</span>
                          {isStepComplete && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold border-emerald-200 gap-1">
                              <CheckCircle2 size={11} /> ステップ完了
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                          {step.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                        <div className="text-right text-xs">
                          <span className="text-slate-400 font-medium">進捗:</span>{" "}
                          <strong className="text-slate-900 font-mono">
                            {completedStepTasks}/{totalStepTasks}
                          </strong>
                          <span className="text-slate-400 ml-1">
                            ({totalStepTasks > 0 ? Math.round((completedStepTasks / totalStepTasks) * 100) : 0}%)
                          </span>
                        </div>
                        <Button
                          onClick={() => openCreateDialog(step.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-xs gap-1 no-print border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <Plus size={12} />
                          タスク追加
                        </Button>
                      </div>
                    </div>

                    {/* Task Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-2.5 px-4 w-12 text-center">状態</th>
                            <th className="py-2.5 px-4">タスク名・内容</th>
                            <th className="py-2.5 px-3 w-28 text-center">担当</th>
                            <th className="py-2.5 px-3 w-28 text-center">期日</th>
                            <th className="py-2.5 px-3 w-20 text-center">優先度</th>
                            <th className="py-2.5 px-3 w-24 text-center no-print">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {stepTasks.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-xs text-slate-400 font-medium">
                                該当するタスクはありません
                              </td>
                            </tr>
                          ) : (
                            stepTasks.map((task) => (
                              <tr key={task.id} className="hover:bg-slate-50/60 transition-colors group">
                                {/* Status Toggle Column */}
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleCycleStatus(task.id)}
                                    className="cursor-pointer transition-transform active:scale-90"
                                    title="クリックでステータス切り替え (未着手 ➡️ 進行中 ➡️ レビュー ➡️ 完了)"
                                  >
                                    {task.status === "completed" && (
                                      <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                                    )}
                                    {task.status === "in_progress" && (
                                      <Clock size={18} className="text-blue-500 fill-blue-50 animate-pulse" />
                                    )}
                                    {task.status === "in_review" && (
                                      <AlertCircle size={18} className="text-amber-500 fill-amber-50" />
                                    )}
                                    {task.status === "not_started" && (
                                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 mx-auto" />
                                    )}
                                  </button>
                                </td>

                                {/* Title & Description */}
                                <td className="py-3 px-4">
                                  <div className="flex items-start gap-2">
                                    <div className="space-y-0.5">
                                      <span
                                        className={cn(
                                          "font-bold text-slate-900 transition-colors cursor-pointer",
                                          task.status === "completed" && "line-through text-slate-400 font-normal"
                                        )}
                                        onClick={() => openEditDialog(task)}
                                      >
                                        {task.title}
                                      </span>
                                      {task.description && (
                                        <p className="text-[11px] text-slate-500 leading-snug">{task.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Assignee */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[11px]">
                                    {task.assignee}
                                  </span>
                                </td>

                                {/* Due Date */}
                                <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                                  {task.dueDate}
                                </td>

                                {/* Priority Badge */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                      task.priority === "high" && "bg-red-50 text-red-600 border border-red-200",
                                      task.priority === "medium" && "bg-amber-50 text-amber-600 border border-amber-200",
                                      task.priority === "low" && "bg-slate-100 text-slate-600"
                                    )}
                                  >
                                    {task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                                  </span>
                                </td>

                                {/* Actions (No Print) */}
                                <td className="py-3 px-3 text-center no-print">
                                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(task)}
                                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                                      title="タスク編集"
                                    >
                                      <Edit3 size={13} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                      title="タスク削除"
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
                );
              })}
            </div>
          </TabsContent>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: OPERATIONAL SPECIFICATIONS & GUIDELINES                     */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="specs" className="space-y-6 mt-6 focus-visible:outline-none">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-8">
              {/* Document Header */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <ShieldCheck size={16} />
                  <span>PROJECT GOVERNANCE & EXECUTION SPECIFICATIONS</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-1">
                  SO ENGLISH! リリース運用仕様書 ＆ 進行ルール
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  本仕様書は、本学習プラットフォームのリリースまでの品質担保、タスク進行、判定基準、およびチーム内エスカレーションプロトコルを定めます。
                </p>
              </div>

              {/* Section 1 */}
              <section className="space-y-3 page-break-inside-avoid">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-l-4 border-primary pl-2.5">
                  第1章：プロジェクト体制と推進ポリシー
                </h3>
                <div className="bg-slate-50/70 rounded-xl p-4 text-xs text-slate-700 space-y-2 border border-slate-200/60 leading-relaxed">
                  <p>
                    <strong>1. 統括担当（総括責任者）の責務:</strong>
                    プロジェクト全体のスケジュール管理、各ステップの達成判定（Definition of Doneの承認）、緊急ブロッカーの解除判断、および最終リリース判定を行います。
                  </p>
                  <p>
                    <strong>2. 開発メンバーの自律遂行原則:</strong>
                    各タスクは担当者が責任を持ち、実装完了・単体テスト作成・型安全検査（`npm run check`）の完了までを一貫して担当します。
                  </p>
                  <p>
                    <strong>3. 成果物の透明性と即時同期:</strong>
                    すべてのコード変更は本番DB（TiDB Cloud）とRenderパイプラインの動作を念頭に置き、GitHub `main` ブランチへコミット・プッシュして実証します。
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="space-y-3 page-break-inside-avoid">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-l-4 border-emerald-500 pl-2.5">
                  第2章：タスクライフサイクルと完了の定義（Definition of Done）
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-28">ステータス</th>
                        <th className="py-2.5 px-3">定義・移行条件</th>
                        <th className="py-2.5 px-3">必須アクション</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-3 px-3 font-bold text-slate-500">⚪ 未着手 (Not Started)</td>
                        <td className="py-3 px-3 text-slate-600">要件が定義され、着手待ちの状態。</td>
                        <td className="py-3 px-3 text-slate-600">前提タスクの依存関係を確認する。</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-blue-600">🔵 進行中 (In Progress)</td>
                        <td className="py-3 px-3 text-slate-600">担当者が作業に着手し、コード作成または検証中。</td>
                        <td className="py-3 px-3 text-slate-600">ステータスを変更し、日次で進捗を報告する。</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-amber-600">🟠 レビュー中 (In Review)</td>
                        <td className="py-3 px-3 text-slate-600">機能実装が完了し、動作確認やコード監査中。</td>
                        <td className="py-3 px-3 text-slate-600">TypeScript型検査およびユニットテストを実行する。</td>
                      </tr>
                      <tr className="bg-emerald-50/40">
                        <td className="py-3 px-3 font-bold text-emerald-600">🟢 完了 (Done)</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          <strong>【完了の定義】</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                            <li>TypeScript型検査 (`npm run check`) エラー0件</li>
                            <li>自動テストスイート (`npm run test`) 全件パス</li>
                            <li>本番環境（Render / TiDB）での動作確認完了</li>
                            <li>Gitコミットおよびリモートへのプッシュ完了</li>
                          </ul>
                        </td>
                        <td className="py-3 px-3 text-slate-600">総括担当による承認確認を行い、ロードマップを更新。</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-3 page-break-inside-avoid">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-l-4 border-indigo-600 pl-2.5">
                  第3章：リリース判定ゲート基準 (Release Gates)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Gate 1: コード＆型品質
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      `tsc --noEmit` の実行でエラーが一切存在せず、Vite 本番バンドルビルドが警告なしで生成されること。
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <Database size={14} /> Gate 2: データ整合性
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      TiDB Cloudの物理テーブル定義とDrizzleスキーマが完全一致し、受講生の進捗・ポイント・既読が正しく保存されること。
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <Award size={14} /> Gate 3: 受講生UX検証
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal">
                      iPhone/Android実機およびDesktopでのレイアウト崩れがなく、音読録音やストリーク演出が滑らかに動作すること。
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section className="space-y-3 page-break-inside-avoid">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-l-4 border-amber-500 pl-2.5">
                  第4章：ブロッカー発生時のエスカレーションフロー
                </h3>
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-2 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle size={15} />
                    <span>遅延予兆・障害発生時の緊急連絡プロトコル</span>
                  </div>
                  <ul className="list-decimal pl-4 space-y-1 text-slate-700">
                    <li>
                      <strong>重大度 P0 (即時対応):</strong>
                      本番DB接続断、決済失敗、ログイン不能など ➡️ 直ちに総括担当へ報告し、直前安定版へのロールバックを判断。
                    </li>
                    <li>
                      <strong>重大度 P1 (主要機能ブロック):</strong>
                      音読レッスン音声処理失敗、既読判定バグなど ➡️ 24時間以内に修正PR作成および検証を義務付け。
                    </li>
                    <li>
                      <strong>重大度 P2 (軽微なUI・文言):</strong>
                      フォントや余白、文言統一など ➡️ 通常スプリント内のタスクとして計画的に修正反映。
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-3 page-break-inside-avoid">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 border-l-4 border-sky-500 pl-2.5">
                  第5章：PDF出力および週次報告フォーマット
                </h3>
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p>
                    本アプリケーションは、右上の「<strong>PDF書き出し</strong>」ボタンからいつでも最新の進捗レポートおよび仕様書をA4サイズPDFとしてエクスポート可能です。
                  </p>
                  <p>
                    週次定例会議またはステークホルダーへの進捗共有時には、ダッシュボード画面から最新のタスク達成率を確認し、PDF印刷（送信）したドキュメントを用いて報告を行います。
                  </p>
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TASK ADD / EDIT DIALOG                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-slate-900">
              {editingTaskId ? "タスクを編集" : "新規To Doタスク追加"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs sm:text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">所属ステップ *</Label>
              <Select value={taskFormStepId.toString()} onValueChange={(v) => setTaskFormStepId(Number(v))}>
                <SelectTrigger className="h-9 rounded-xl border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_STEPS.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.stepNumber}: {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">タスク名 *</Label>
              <Input
                value={taskFormTitle}
                onChange={(e) => setTaskFormTitle(e.target.value)}
                placeholder="例: Stripe決済エラー時のリトライ通知ハンドリング"
                className="h-9 rounded-xl border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600">詳細説明・受け入れ基準</Label>
              <Textarea
                value={taskFormDescription}
                onChange={(e) => setTaskFormDescription(e.target.value)}
                placeholder="具体的な作業要件、達成条件を記入..."
                rows={3}
                className="rounded-xl border-slate-300 min-h-[70px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">ステータス</Label>
                <Select value={taskFormStatus} onValueChange={(v) => setTaskFormStatus(v as any)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">⚪ 未着手</SelectItem>
                    <SelectItem value="in_progress">🔵 進行中</SelectItem>
                    <SelectItem value="in_review">🟠 レビュー中</SelectItem>
                    <SelectItem value="completed">🟢 完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">優先度</Label>
                <Select value={taskFormPriority} onValueChange={(v) => setTaskFormPriority(v as any)}>
                  <SelectTrigger className="h-9 rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 高 (High)</SelectItem>
                    <SelectItem value="medium">🟡 中 (Medium)</SelectItem>
                    <SelectItem value="low">⚪ 低 (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">担当者</Label>
                <Input
                  value={taskFormAssignee}
                  onChange={(e) => setTaskFormAssignee(e.target.value)}
                  placeholder="例: フロントエンド担当"
                  className="h-9 rounded-xl border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">完了目標日</Label>
                <Input
                  type="date"
                  value={taskFormDueDate}
                  onChange={(e) => setTaskFormDueDate(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsTaskDialogOpen(false)} className="rounded-xl">
              キャンセル
            </Button>
            <Button size="sm" onClick={handleSaveTask} className="rounded-xl pride-gradient text-white font-bold gap-1">
              <Check size={14} />
              {editingTaskId ? "変更を保存" : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PRINT / PDF EXPORT MODAL                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={printOptionOpen} onOpenChange={setPrintOptionOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer size={18} className="text-primary" />
              PDF書き出し設定
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-600 leading-relaxed py-2">
            ブラウザの印刷ダイアログから「<strong>PDFとして保存</strong>」を選択することで、高解像度のA4文書として書き出すことができます。書き出す対象を選択してください。
          </p>

          <div className="space-y-2.5 py-2">
            <button
              type="button"
              onClick={() => handleTriggerPrint("dashboard")}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between text-left transition-all group"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 group-hover:text-primary">
                  1. 進捗管理ダッシュボード ＆ ロードマップのみ
                </p>
                <p className="text-[11px] text-slate-500">全体KPI、マイルストーン、各ステップのタスク一覧をPDF保存</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => handleTriggerPrint("specs")}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex items-center justify-between text-left transition-all group"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                  2. 運用仕様書 ＆ ルール定義書のみ
                </p>
                <p className="text-[11px] text-slate-500">体制、タスク定義、判定基準、エスカレーション規程をPDF保存</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={() => handleTriggerPrint("current")}
              className="w-full p-3.5 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 flex items-center justify-between text-left transition-all group"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-primary">
                  3. 現在表示中の画面をそのままPDF出力
                </p>
                <p className="text-[11px] text-slate-500">現在選択されているタブの画面を即時に書き出します</p>
              </div>
              <ChevronRight size={16} className="text-primary transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setPrintOptionOpen(false)} className="rounded-xl text-xs">
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle, Send, ChevronLeft, User, Clock, Search, Plus, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [page] = useState({ limit: 50, offset: 0 });
  const { data: questions, isLoading } = trpc.qa.posts.useQuery(page);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const createPost = trpc.qa.createPost.useMutation({
    onSuccess: () => {
      toast.success("メッセージを送信しました");
      setShowNew(false);
      setNewTitle("");
      setNewBody("");
      utils.qa.posts.invalidate();
    },
    onError: () => toast.error("送信に失敗しました"),
  });

  const selectedPost = questions?.find((q: any) => q.id === selectedId);
  const { data: answers } = trpc.qa.answers.useQuery(
    { postId: selectedId! },
    { enabled: !!selectedId }
  );

  const [replyText, setReplyText] = useState("");
  const postAnswer = trpc.qa.createAnswer.useMutation({
    onSuccess: () => {
      toast.success("返信しました");
      setReplyText("");
      utils.qa.answers.invalidate({ postId: selectedId! });
      utils.qa.posts.invalidate();
    },
  });

  const filtered = useMemo(() => {
    if (!questions) return [];
    if (!searchQuery) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter((p: any) =>
      p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  const formatDate = (d: string | Date) => {
    const date = new Date(d);
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Detail view
  if (selectedId && selectedPost) {
    return (
      <div className="pb-6">
        <div className="px-4 pt-4 sm:px-6">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft size={16} /> メッセージ一覧
          </button>
        </div>

        <div className="px-4 sm:px-6 space-y-4">
          {/* Original message */}
          <div className="premium-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full pride-gradient flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{(selectedPost as any).authorName ?? "メンバー"}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(selectedPost.createdAt)}</p>
              </div>
            </div>
            <h2 className="font-bold text-foreground mb-2">{selectedPost.title}</h2>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedPost.body}</p>
          </div>

          {/* Answers */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground px-1">返信 ({answers?.length ?? 0})</h3>
            {answers?.map((a: any) => (
              <div key={a.id} className="premium-card rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <User size={10} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{a.authorName ?? "メンバー"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(a.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{a.body}</p>
              </div>
            ))}
          </div>

          {/* Reply form */}
          <div className="premium-card rounded-2xl p-4">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="返信を入力..."
              className="min-h-20 rounded-xl text-sm resize-none mb-2"
            />
            <Button size="sm"
              onClick={() => postAnswer.mutate({ postId: selectedId, body: replyText })}
              disabled={postAnswer.isPending || !replyText.trim()}
              className="pride-gradient border-0 text-white rounded-lg text-xs">
              <Send size={12} className="mr-1" /> 返信する
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="pb-6">
      <div className="px-4 pt-5 pb-3 sm:px-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            <h1 className="font-serif text-xl font-bold text-foreground">メッセージ</h1>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)} className="pride-gradient border-0 text-white rounded-lg text-xs h-8">
            <Plus size={12} className="mr-1" /> 新規
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="メッセージを検索..."
            className="pl-9 h-9 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* New message form */}
      {showNew && (
        <div className="px-4 sm:px-6 mb-4">
          <div className="premium-card rounded-2xl p-4 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">新しいメッセージ</h3>
              <button onClick={() => setShowNew(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="タイトル" className="mb-2 h-9 rounded-lg text-sm" />
            <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)}
              placeholder="メッセージ内容..." className="min-h-24 rounded-lg text-sm resize-none mb-2" />
            <Button size="sm"
              onClick={() => createPost.mutate({ title: newTitle, body: newBody })}
              disabled={createPost.isPending || !newTitle.trim() || !newBody.trim()}
              className="pride-gradient border-0 text-white rounded-lg text-xs">
              <Send size={12} className="mr-1" /> 送信
            </Button>
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="px-4 sm:px-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : !filtered?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">メッセージはまだありません</p>
          </div>
        ) : (
          filtered.map((q: any) => (
            <button key={q.id} onClick={() => setSelectedId(q.id)}
              className="w-full premium-card rounded-xl p-3.5 text-left hover:shadow-md transition-shadow active:scale-[0.99]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full pride-gradient flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{q.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                      <Clock size={10} /> {formatDate(q.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{q.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>{q.authorName ?? "メンバー"}</span>
                    <span>{q.answersCount ?? 0} 返信</span>
                    <span>{q.likesCount ?? 0} いいね</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

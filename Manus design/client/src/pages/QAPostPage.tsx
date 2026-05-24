import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, CheckCircle2, ChevronLeft, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";

export default function QAPostPage() {
  const params = useParams<{ id: string }>();
  const postId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: post, isLoading: loadingPost } = trpc.qa.post.useQuery({ id: postId });
  const { data: answers, isLoading: loadingAnswers } = trpc.qa.answers.useQuery({ postId });
  const { data: myLikes } = trpc.qa.myLikes.useQuery();

  const [answerText, setAnswerText] = useState("");

  const createAnswer = trpc.qa.createAnswer.useMutation({
    onSuccess: () => {
      toast.success("Answer posted! 🌈");
      setAnswerText("");
      utils.qa.answers.invalidate({ postId });
    },
    onError: (err) => toast.error(err.message || "Could not post answer"),
  });

  const markBest = trpc.qa.markBestAnswer.useMutation({
    onSuccess: () => {
      toast.success("Best answer marked! ✓");
      utils.qa.answers.invalidate({ postId });
      utils.qa.post.invalidate({ id: postId });
    },
  });

  const toggleLike = trpc.qa.toggleLike.useMutation({
    onSuccess: () => utils.qa.myLikes.invalidate(),
  });

  const likedAnswerIds = new Set(myLikes?.filter((l) => l.answerId).map((l) => l.answerId) ?? []);

  if (loadingPost) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Post not found.</p>
        <Button className="mt-4" onClick={() => navigate("/qa")}>Back to Q&A</Button>
      </div>
    );
  }

  const isPostOwner = (user as any)?.id === post.userId;
  const isAdmin = (user as any)?.role === "admin";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/qa")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Back to Q&A
      </button>

      {/* Question */}
      <div className="premium-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {post.answersCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold mb-2">
                <CheckCircle2 size={11} /> Answered
              </span>
            )}
            <h1 className="font-serif text-2xl font-bold text-foreground">{post.title}</h1>
          </div>
        </div>

        <div className="h-0.5 rounded-full pride-gradient mb-4" />

        <p className="text-foreground leading-relaxed">{post.body}</p>

        <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{(post as any).userName ?? "Member"}</span>
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Answers */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-primary" />
          {answers?.length ?? 0} {answers?.length === 1 ? "Answer" : "Answers"}
        </h2>

        {loadingAnswers ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : answers?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageCircle size={36} className="mx-auto mb-2 opacity-30" />
            <p>No answers yet. Be the first to help!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {answers?.map((answer) => {
              const liked = likedAnswerIds.has(answer.id);
              return (
                <div
                  key={answer.id}
                  className={cn(
                    "rounded-2xl p-5 border transition-all",
                    answer.isBestAnswer
                      ? "border-green-300 bg-green-50/50"
                      : "bg-card border-border"
                  )}
                >
                  {answer.isBestAnswer && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Best Answer</span>
                    </div>
                  )}

                  <p className="text-foreground leading-relaxed">{answer.body}</p>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{(answer as any).userName ?? "Member"}</span>
                      <span>·</span>
                      <span>{new Date(answer.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(isPostOwner || isAdmin) && !answer.isBestAnswer && (
                        <button
                          onClick={() => markBest.mutate({ answerId: answer.id, postId })}
                          className="text-xs px-2 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
                        >
                          Mark Best
                        </button>
                      )}
                      <button
                        onClick={() => toggleLike.mutate({ answerId: answer.id })}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-sm",
                          liked ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-red-400 hover:bg-red-50"
                        )}
                      >
                        <Heart size={14} fill={liked ? "currentColor" : "none"} />
                        <span>{answer.likesCount ?? 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Post answer */}
      <div className="premium-card rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Your Answer</h3>
        <Textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Share your knowledge or experience... 🌈"
          className="min-h-32 rounded-xl border-border resize-none mb-3"
        />
        <Button
          onClick={() => createAnswer.mutate({ postId, body: answerText })}
          disabled={createAnswer.isPending || !answerText.trim()}
          className="pride-gradient border-0 text-white rounded-xl hover:opacity-90"
        >
          {createAnswer.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
          Post Answer
        </Button>
      </div>
    </div>
  );
}

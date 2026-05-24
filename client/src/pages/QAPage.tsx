import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Heart, Plus, ChevronRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";

export default function QAPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: posts, isLoading } = trpc.qa.posts.useQuery({ limit: 50, offset: 0 });
  const { data: myLikes } = trpc.qa.myLikes.useQuery();

  const createPost = trpc.qa.createPost.useMutation({
    onSuccess: () => {
      toast.success("Question posted! 🌈");
      setNewTitle(""); setNewBody(""); setDialogOpen(false);
      utils.qa.posts.invalidate();
    },
    onError: (err) => toast.error(err.message || "Could not post question"),
  });

  const toggleLike = trpc.qa.toggleLike.useMutation({
    onSuccess: () => utils.qa.posts.invalidate(),
  });

  const likedPostIds = new Set(myLikes?.filter((l) => l.postId).map((l) => l.postId) ?? []);

  const filtered = posts?.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.body.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Community <span className="pride-gradient-text">Q&A</span>
          </h1>
          <p className="text-muted-foreground mt-1">Ask questions, share knowledge, support each other 🌈</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="pride-gradient border-0 text-white rounded-xl hover:opacity-90 shadow-md">
              <Plus size={16} className="mr-2" /> Ask a Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Ask the Community</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Question title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How do I say 'coming out' naturally in English?"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Provide more context about your question..."
                  className="rounded-xl min-h-28"
                />
              </div>
              <Button
                onClick={() => createPost.mutate({ title: newTitle, body: newBody })}
                disabled={createPost.isPending || !newTitle.trim() || !newBody.trim()}
                className="w-full pride-gradient border-0 text-white rounded-xl"
              >
                {createPost.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Post Question
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="h-1 rounded-full pride-gradient" />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="pl-10 rounded-xl h-11"
        />
      </div>

      {/* Posts list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle size={48} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No questions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to ask something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const liked = likedPostIds.has(post.id);
            return (
              <div key={post.id} className="premium-card rounded-2xl p-5 group">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/qa/${post.id}`}>
                    <div className="flex-1 cursor-pointer">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{post.body}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{(post as any).userName ?? "Member"}</span>
                        <span>·</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} /> {(post as any).answerCount ?? 0} answers
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleLike.mutate({ postId: post.id })}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        liked ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-red-400 hover:bg-red-50"
                      )}
                    >
                      <Heart size={18} fill={liked ? "currentColor" : "none"} />
                    </button>
                    <span className="text-xs text-muted-foreground font-medium">{post.likesCount ?? 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  {post.answersCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Answered</span>
                  )}
                  <Link href={`/qa/${post.id}`}>
                    <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1 ml-auto">
                      View & Answer <ChevronRight size={12} />
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CornerDownRight, Heart, MessageSquare, Send } from 'lucide-react';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';

export interface CommentThreadItem {
  id: string;
  author: {
    id: string;
    name: string;
    role?: string;
  };
  content: string;
  createdAt: string;
  likes?: number;
  replies?: CommentThreadItem[];
}

interface CommentSectionProps {
  comments: CommentThreadItem[];
  onSubmitComment?: (content: string, parentId?: string) => Promise<void>;
  title?: string;
}

export function CommentSection({
  comments,
  onSubmitComment,
  title = 'Comments',
}: CommentSectionProps) {
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalComments = useMemo(
    () =>
      comments.reduce(
        (count, comment) => count + 1 + (comment.replies?.length ?? 0),
        0,
      ),
    [comments],
  );

  const handleSubmit = async () => {
    if (!onSubmitComment || !draft.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitComment(draft.trim());
      setDraft('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-blue-100/55">
            {totalComments} conversation entr{totalComments === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <MessageSquare className="h-5 w-5 text-blue-300" />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/40">
          Add a comment
        </label>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
          placeholder="Reply with context, feedback, or an emoji reaction..."
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60 focus:bg-white/10"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-blue-100/35">
            Threaded replies supported
          </span>
          <button
            type="button"
            disabled={!draft.trim() || isSubmitting || !onSubmitComment}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Posting...' : 'Post comment'}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onSubmitComment={onSubmitComment}
          />
        ))}
      </div>
    </section>
  );
}

function CommentCard({
  comment,
  onSubmitComment,
  depth = 0,
}: {
  comment: CommentThreadItem;
  onSubmitComment?: (content: string, parentId?: string) => Promise<void>;
  depth?: number;
}) {
  const [replyDraft, setReplyDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const dateFnsLocale = useDateFnsLocale();

  const handleReply = async () => {
    if (!onSubmitComment || !replyDraft.trim()) {
      return;
    }

    setIsSubmittingReply(true);
    try {
      await onSubmitComment(replyDraft.trim(), comment.id);
      setReplyDraft('');
      setIsReplying(false);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-white/10 pl-5' : ''}`}>
      <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">
                {comment.author.name}
              </h3>
              {comment.author.role ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/50">
                  {comment.author.role}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-blue-100/40">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: dateFnsLocale,
              })}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-100/55">
            <Heart className="h-3.5 w-3.5" />
            {comment.likes ?? 0}
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-blue-50/85">
          {comment.content}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReplying((current) => !current)}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300 transition hover:text-white"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            Reply
          </button>
        </div>

        {isReplying && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              rows={3}
              placeholder="Add a threaded reply..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white outline-none transition placeholder:text-blue-100/30 focus:border-blue-400/60"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={
                  !replyDraft.trim() || !onSubmitComment || isSubmittingReply
                }
                onClick={() => void handleReply()}
                className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmittingReply ? 'Replying...' : 'Reply'}
              </button>
            </div>
          </div>
        )}
      </article>

      {comment.replies?.length ? (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onSubmitComment={onSubmitComment}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

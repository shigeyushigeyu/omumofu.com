import React, { useState, useEffect } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { createEventComment, subscribeToEventComments, getUserProfile } from '../../lib/firebaseUtils';
import { useAuth } from '../../hooks/useAuth';
import type { Comment, UserProfile } from '../../types/schema';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface EventCommentsProps {
  eventId: string;
}

export const EventComments: React.FC<EventCommentsProps> = ({ eventId }) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToEventComments(eventId, (newComments) => {
      setComments(newComments);
      setLoading(false);
      
      // Fetch missing profiles
      newComments.forEach(comment => {
        if (!profiles[comment.authorId]) {
          getUserProfile(comment.authorId).then(profile => {
            if (profile) {
              setProfiles(prev => ({ ...prev, [comment.authorId]: profile }));
            }
          });
        }
      });
    });

    return () => unsubscribe();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      setSubmitting(true);
      await createEventComment(eventId, currentUser.uid, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <MessageCircle className="mr-2 text-pink-500" />
        コメント ({comments.length})
      </h3>

      <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">まだコメントはありません。最初のコメントを書き込みましょう！</p>
        ) : (
          comments.map(comment => {
            const profile = profiles[comment.authorId];
            return (
              <div key={comment.id} className="flex space-x-3">
                <a href={`/user?uid=${comment.authorId}`} className="flex-shrink-0">
                  {profile?.profileImageUrl ? (
                    <img src={profile.profileImageUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                      {profile?.displayName?.charAt(0) || '?'}
                    </div>
                  )}
                </a>
                <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <a href={`/user?uid=${comment.authorId}`} className="font-bold text-sm text-gray-900 hover:underline">
                      {profile?.displayName || '読み込み中...'}
                    </a>
                    <span className="text-xs text-gray-500">
                      {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: ja }) : '送信中...'}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all outline-none resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white rounded-xl px-4 py-2 flex items-center justify-center transition-colors self-end h-12"
          >
            {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      ) : (
        <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-200">
          <p className="text-gray-600 text-sm">コメントするにはログインが必要です</p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { X, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Post, UserProfile, Comment } from '../../../types/schema';
import { getUserProfile, toggleLike, checkHasLiked, createComment } from '../../../lib/firebaseUtils';

interface PostDetailModalProps {
  postId: string;
  currentUser: User | null;
  onClose: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ postId, currentUser, onClose }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<(Comment & { authorProfile?: UserProfile })[]>([]);
  
  // Optimistic UI states
  const [isLiked, setIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Comment input
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fetch post
    const fetchPost = async () => {
      const docRef = doc(db, 'posts', postId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const p = { ...data, id: snap.id, createdAt: data.createdAt?.toDate() } as Post;
        setPost(p);
        setLocalLikeCount(p.likeCount || 0);
        if (p.authorId) {
          getUserProfile(p.authorId).then(setAuthor);
        }
      }
    };
    fetchPost();

    if (currentUser) {
      checkHasLiked(postId, currentUser.uid).then(setIsLiked);
    }
  }, [postId, currentUser]);

  useEffect(() => {
    // Listen to comments
    const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawComments = snapshot.docs.map(d => {
        const data = d.data();
        return { ...data, id: d.id, createdAt: data.createdAt?.toDate() } as Comment;
      });
      
      // Fetch profiles for comments
      const enriched = await Promise.all(rawComments.map(async (c) => {
        const profile = await getUserProfile(c.authorId);
        return { ...c, authorProfile: profile || undefined };
      }));
      setComments(enriched);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleLikeClick = () => {
    if (!currentUser) {
      alert("いいねするにはログインしてね🎀");
      return;
    }
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLocalLikeCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await toggleLike(postId, currentUser.uid, newIsLiked);
      } catch (error) {
        console.error("Failed to toggle like", error);
        setIsLiked(!newIsLiked);
        setLocalLikeCount(prev => !newIsLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    }, 500);
  };

  const handleReplyClick = (username: string) => {
    setCommentInput(prev => `${prev}@${username} `);
    inputRef.current?.focus();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("コメントするにはログインしてね🎀");
      return;
    }
    if (!commentInput.trim()) return;

    try {
      setSubmittingComment(true);
      await createComment(postId, currentUser.uid, commentInput.trim());
      setCommentInput('');
    } catch (error) {
      alert("コメントの送信に失敗しました");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!post) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="white" size={40} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }} onClick={onClose}>
      
      <div className="post-detail-modal" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="close-btn-desktop"
        >
          <X size={28} />
        </button>

        <div className="post-detail-layout">
          {/* Image Section */}
          <div className="post-image-section">
            <button onClick={onClose} className="close-btn-mobile"><X size={24} /></button>
            {post.imageUrls && post.imageUrls.length > 0 ? (
              <img src={post.imageUrls[0]} alt="Post" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No Image</div>
            )}
          </div>

          {/* Details Section */}
          <div className="post-info-section">
            <div className="post-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ffe0e6', overflow: 'hidden' }}>
                  {author?.profileImageUrl ? <img src={author.profileImageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
                <strong style={{ color: '#4a3e3d', fontSize: '1.1rem' }}>{author?.displayName || '名無しさん'}</strong>
              </div>
            </div>

            <div className="post-content">
              <p style={{ margin: 0, lineHeight: 1.6, color: '#555' }}>{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                  {post.tags.map(t => (
                    <span key={t} style={{ color: '#d36ba6', fontSize: '0.9rem' }}>#{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="post-actions">
              <button onClick={handleLikeClick} className="action-btn" style={{ color: isLiked ? '#ff4757' : '#888' }}>
                <Heart size={24} fill={isLiked ? '#ff4757' : 'none'} className={isLiked ? "heart-pop" : ""} />
                <span>{localLikeCount}</span>
              </button>
              <div className="action-btn">
                <MessageCircle size={24} />
                <span>{comments.length}</span>
              </div>
            </div>

            <div className="comments-list">
              {comments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#aaa', margin: '30px 0' }}>まだコメントはありません🎀</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="comment-item">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f0f0f0', overflow: 'hidden', flexShrink: 0 }}>
                      {c.authorProfile?.profileImageUrl && <img src={c.authorProfile.profileImageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#4a3e3d' }}>{c.authorProfile?.displayName || '名無しさん'}</strong>
                        <button 
                          onClick={() => handleReplyClick(c.authorProfile?.displayName || '名無しさん')}
                          style={{ background: 'none', border: 'none', color: '#8cc63f', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                        >
                          返信
                        </button>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '0.95rem', color: '#555', wordBreak: 'break-word' }}>{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="comment-input-area">
              {currentUser ? (
                <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    placeholder="コメントを追加..."
                    rows={1}
                    style={{ flex: 1, padding: '12px 15px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '0.95rem' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
                    }}
                  />
                  <button type="submit" disabled={submittingComment || !commentInput.trim()} style={{ background: 'none', border: 'none', color: commentInput.trim() ? '#8cc63f' : '#ccc', fontWeight: 'bold', padding: '10px', cursor: commentInput.trim() ? 'pointer' : 'default' }}>
                    {submittingComment ? <Loader2 className="animate-spin" size={20} /> : '送信'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '0.9rem' }}>
                  コメントするには<a href="/login" style={{ color: '#d36ba6' }}>ログイン</a>してね
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .post-detail-modal {
          background: #fff;
          width: 100%;
          height: 100%;
          display: flex;
          position: relative;
        }

        .post-detail-layout {
          display: flex;
          width: 100%;
          height: 100%;
          flex-direction: column;
        }

        .post-image-section {
          flex: 1;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .post-image-section img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .post-info-section {
          width: 100%;
          height: 50vh;
          background: #fff;
          display: flex;
          flex-direction: column;
        }

        .post-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
        }

        .post-content {
          padding: 15px 20px;
        }

        .post-actions {
          padding: 10px 20px;
          display: flex;
          gap: 20px;
          border-bottom: 1px solid #eee;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .comments-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px 20px;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          margin-bottom: 15px;
        }

        .comment-input-area {
          padding: 15px 20px;
          border-top: 1px solid #eee;
          background: #fff;
        }

        .close-btn-desktop {
          display: none;
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          z-index: 10;
        }

        .close-btn-mobile {
          position: absolute;
          top: 15px;
          left: 15px;
          background: rgba(0,0,0,0.5);
          border: none;
          color: #fff;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        @keyframes heartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .heart-pop {
          animation: heartPop 0.3s ease-out;
        }

        /* Desktop Layout */
        @media (min-width: 768px) {
          .post-detail-modal {
            width: 80%;
            height: 80vh;
            max-width: 1200px;
            border-radius: 12px;
            overflow: hidden;
          }
          .post-detail-layout {
            flex-direction: row;
          }
          .post-image-section {
            flex: 6;
            height: 100%;
          }
          .post-info-section {
            flex: 4;
            height: 100%;
            min-width: 350px;
            max-width: 500px;
            border-left: 1px solid #eee;
          }
          .close-btn-desktop {
            display: block;
            right: -50px;
            top: 0;
          }
          .close-btn-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

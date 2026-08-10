import React, { useState, useEffect, useRef } from 'react';
import type { Post, UserProfile } from '../../../types/schema';
import { getUserProfile, toggleLike, checkHasLiked } from '../../../lib/firebaseUtils';
import { Heart, MessageCircle } from 'lucide-react';
import type { User } from 'firebase/auth';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onClick: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onClick }) => {
  const [author, setAuthor] = useState<UserProfile | null>(null);
  
  // Optimistic UI states
  const [isLiked, setIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || 0);
  
  // Ref for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Sync with external updates
    setLocalLikeCount(post.likeCount || 0);
  }, [post.likeCount]);

  useEffect(() => {
    // Fetch author profile
    if (post.authorId) {
      getUserProfile(post.authorId).then(setAuthor);
    }
    
    // Check initial like status
    if (currentUser) {
      checkHasLiked(post.id, currentUser.uid).then(setIsLiked);
    }
  }, [post.authorId, post.id, currentUser]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the post detail modal
    if (!currentUser) {
      alert("いいねするにはログインしてね🎀");
      return;
    }

    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLocalLikeCount(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    // Debounce API call
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        await toggleLike(post.id, currentUser.uid, newIsLiked);
      } catch (error) {
        console.error("Failed to toggle like", error);
        // Revert optimistic update on error
        setIsLiked(!newIsLiked);
        setLocalLikeCount(prev => !newIsLiked ? prev + 1 : Math.max(0, prev - 1));
      }
    }, 500); // 500ms debounce
  };

  return (
    <div 
      className="post-card" 
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        border: '1px solid #ffe0e6',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 192, 203, 0.3)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', backgroundColor: '#f7f3f0' }}>
        {post.imageUrls && post.imageUrls.length > 0 ? (
          <img 
            src={post.imageUrls[0]} 
            alt="投稿画像" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            No Image
          </div>
        )}
      </div>
      
      <div style={{ padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ffe0e6', overflow: 'hidden' }}>
            {author?.profileImageUrl ? (
              <img src={author.profileImageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
          <span style={{ fontWeight: 'bold', color: '#4a3e3d', fontSize: '0.9rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {author?.displayName || '名無しさん'}
          </span>
        </div>
        
        <p style={{ 
          fontSize: '0.95rem', 
          color: '#555', 
          margin: '0 0 15px 0', 
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden' 
        }}>
          {post.content}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#888' }}>
          <button 
            onClick={handleLikeClick}
            className="like-btn-action"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '4px 8px',
              borderRadius: '20px',
              transition: 'background 0.2s',
              color: isLiked ? '#ff4757' : '#888',
              backgroundColor: isLiked ? '#ffe0e6' : 'transparent',
            }}
          >
            <Heart 
              size={18} 
              fill={isLiked ? '#ff4757' : 'none'} 
              className={isLiked ? "heart-pop" : ""}
            />
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{localLikeCount}</span>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageCircle size={18} />
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{post.commentCount || 0}</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .heart-pop {
          animation: heartPop 0.3s ease-out;
        }
        .like-btn-action:hover {
          background-color: #f5f5f5 !important;
        }
      `}</style>
    </div>
  );
};

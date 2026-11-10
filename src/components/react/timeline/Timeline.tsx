import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { Post } from '../../../types/schema';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { PostDetailModal } from './PostDetailModal';
import { useAuth } from '../../../hooks/useAuth';
import { PenSquare, Loader2 } from 'lucide-react';

export const Timeline: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Post;
      });
      setPosts(postsData.filter(p => p.type === 'image'));
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (authLoading || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader2 className="animate-spin" color="#ffc0cb" size={40} /></div>;
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', color: '#4a3e3d', margin: 0 }}>みんなの投稿 🎀</h1>
        
        {currentUser && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: '#ffc0cb',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '9999px',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(255, 192, 203, 0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <PenSquare size={20} />
            投稿する
          </button>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px', padding: '0 20px' }}>
        <p style={{ fontSize: '1.1rem', color: '#7a6e6b', lineHeight: 1.8, marginBottom: '15px' }}>
          おむもふタイムラインへようこそ！<br />
          ここはかわいいリトルのお写真やイラストを投稿できるよ。<br />
          みんなでいいねしたり、返信しようね。
        </p>
        <small style={{ color: '#e57373', fontSize: '0.9rem', fontWeight: 'bold' }}>
          ※当サイトはR18（成人向け）のコンテンツを含みます。18歳未満の方のアクセスおよび閲覧は固くお断りいたします。
        </small>
      </div>

      {!currentUser && (
        <div style={{ backgroundColor: '#fffafc', padding: '15px 20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ffe0e6', color: '#a05585', textAlign: 'center' }}>
          投稿やいいね、コメントをするには<a href="/login" style={{ color: '#d36ba6', fontWeight: 'bold' }}>ログイン</a>してね🧸
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
          まだ投稿がありません。最初の投稿をしてみよう！
        </div>
      ) : (
        <div className="posts-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={currentUser}
              onClick={() => setSelectedPostId(post.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && currentUser && (
        <CreatePostModal 
          currentUser={currentUser}
          onClose={() => {
            setIsCreateModalOpen(false);
            fetchPosts();
          }} 
        />
      )}
      
      {selectedPostId && (
        <PostDetailModal 
          postId={selectedPostId} 
          currentUser={currentUser}
          onClose={() => setSelectedPostId(null)} 
        />
      )}
    </div>
  );
};

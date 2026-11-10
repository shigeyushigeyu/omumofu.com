import React, { useState, useEffect } from 'react';
import { Loader2, LogIn, MessageCircle } from 'lucide-react';
import { getUserChatRooms, getUserProfile } from '../../lib/firebaseUtils';
import type { ChatRoom } from '../../types/schema';
import { useAuth } from '../../hooks/useAuth';

interface ChatRoomWithPartner extends ChatRoom {
  partnerUid: string;
  partnerName: string;
  partnerAvatar: string;
}

export const ChatList: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      try {
        setLoading(true);
        const chatRooms = await getUserChatRooms(currentUser.uid);

        const enriched = await Promise.all(
          chatRooms.map(async (room) => {
            const partnerUid =
              room.members.find((m) => m !== currentUser.uid) || '';
            let partnerName = '名無しのおともだち';
            let partnerAvatar = '';

            if (partnerUid) {
              try {
                const profile = await getUserProfile(partnerUid);
                if (profile) {
                  partnerName = profile.displayName || '名無しのおともだち';
                  partnerAvatar = profile.profileImageUrl || '';
                }
              } catch (e) {
                console.error('Error loading partner profile:', e);
              }
            }

            return {
              ...room,
              partnerUid,
              partnerName,
              partnerAvatar,
            };
          })
        );

        setRooms(enriched);
      } catch (err) {
        console.error('Error fetching chat list:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [currentUser, authLoading]);

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 className="animate-spin" color="#ffc0cb" size={36} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="profile-card" style={{ textAlign: 'center' }}>
        <LogIn size={48} color="#ffc0cb" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#333' }}>
          ログインが必要です
        </h2>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          おともだちとチャットをするにはログインしてください🍼
        </p>
        <a href="/login" className="save-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          ログインページへ
        </a>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="user-header" style={{ marginBottom: '28px' }}>
        <h1>おともだちチャット 💬</h1>
        <p className="section-desc" style={{ marginTop: '8px', marginBottom: 0 }}>
          やり取りしているおともだちとのトークルーム一覧だよ🧸
        </p>
      </div>

      {rooms.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
          }}
        >
          <MessageCircle
            size={44}
            color="#ffc0cb"
            style={{ margin: '0 auto 12px' }}
          />
          <p style={{ margin: '0 0 20px', color: '#7d5b6b' }}>
            まだチャットルームがありません。<br />
            気になるおともだちのプロフィールから「チャットを送る」を押してみてね🍼
          </p>
          <a
            href="/users"
            className="save-btn"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            🍼 おともだちを探しにいく
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rooms.map((room) => (
            <a
              key={room.id}
              href={`/chat/${encodeURIComponent(room.id)}`}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px 20px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(255, 192, 203, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 10px rgba(180, 120, 140, 0.05)';
              }}
            >
              {/* 相手のプロフィール画像 */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '3px dashed #ffc0cb',
                  backgroundColor: '#fffafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {room.partnerAvatar ? (
                  <img
                    src={room.partnerAvatar}
                    alt={room.partnerName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: '#d36ba6',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    No Image
                  </span>
                )}
              </div>

              {/* 相手の名前と最新メッセージ */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <strong
                    style={{
                      fontSize: '1.1rem',
                      color: '#555',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {room.partnerName}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#999', flexShrink: 0 }}>
                    {room.lastUpdatedAt.toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    {room.lastUpdatedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: room.lastMessage ? '#7d5b6b' : '#aaa',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {room.lastMessage || 'まだメッセージはありません'}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}

      <div
        className="form-actions"
        style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}
      >
        <a href="/users" className="logout-btn" style={{ textDecoration: 'none' }}>
          おともだち検索へ
        </a>
        <a href="/mypage" className="save-btn" style={{ textDecoration: 'none' }}>
          マイページへ
        </a>
      </div>
    </div>
  );
};

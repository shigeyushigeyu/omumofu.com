import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, LogIn, ArrowLeft } from 'lucide-react';
import {
  subscribeToMessages,
  sendMessage,
  getChatRoomById,
  getUserProfile,
} from '../../lib/firebaseUtils';
import type { Message } from '../../types/schema';
import { useAuth } from '../../hooks/useAuth';

interface ChatRoomProps {
  roomId: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { currentUser, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [partnerUid, setPartnerUid] = useState('');
  const [partnerName, setPartnerName] = useState('おともだち');
  const [partnerAvatar, setPartnerAvatar] = useState('');
  const [partnerChatDisabled, setPartnerChatDisabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const initRoom = async () => {
      try {
        setLoading(true);
        const room = await getChatRoomById(roomId);
        if (!room || !room.members.includes(currentUser.uid)) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const otherUid =
          room.members.find((m) => m !== currentUser.uid) || '';
        setPartnerUid(otherUid);

        if (otherUid) {
          try {
            const profile = await getUserProfile(otherUid);
            if (profile) {
              setPartnerName(profile.displayName || '名無しのおともだち');
              setPartnerAvatar(profile.profileImageUrl || '');
              if (profile.privacySettings?.chatAcceptance === 'none') {
                setPartnerChatDisabled(true);
              }
            }
          } catch (e) {
            console.error('Error fetching partner profile:', e);
          }
        }

        unsubscribe = subscribeToMessages(roomId, (newMessages) => {
          setMessages(newMessages);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error initializing chat room:', err);
        setAccessDenied(true);
        setLoading(false);
      }
    };

    initRoom();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [roomId, currentUser, authLoading]);

  // 新しいメッセージが来たら一番下までスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending || cooldown || !currentUser || partnerChatDisabled) {
      return;
    }
    if (trimmed.length > 500) {
      alert('メッセージは500文字以内で送ってね🍼');
      return;
    }

    const now = Date.now();
    if (now - lastSentAtRef.current < 2500) {
      alert('少しだけ間隔をあけて送ってね🧸');
      return;
    }

    try {
      setSending(true);
      setCooldown(true);
      lastSentAtRef.current = now;
      await sendMessage(roomId, currentUser.uid, trimmed);
      setNewMessage('');
      setTimeout(() => setCooldown(false), 2500);
    } catch (err) {
      setCooldown(false);
      alert('メッセージの送信に失敗しました（連続送信は少し待ってから送ってね）');
    } finally {
      setSending(false);
    }
  };

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
          チャットルームを閲覧・送信するにはログインしてください🍼
        </p>
        <a
          href="/login"
          className="save-btn"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          ログインページへ
        </a>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="profile-card" style={{ textAlign: 'center' }}>
        <p style={{ color: '#e64980', fontWeight: 'bold', marginBottom: '20px' }}>
          このチャットルームにはアクセスできません。
        </p>
        <a
          href="/chat"
          className="save-btn"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          チャット一覧へ戻る
        </a>
      </div>
    );
  }

  return (
    <div
      className="profile-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '72vh',
        minHeight: '520px',
        border: '2px dashed #ffc0cb',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          background: '#fffafc',
          borderBottom: '2px dashed #ffc0cb',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <a
            href="/chat"
            title="チャット一覧へ戻る"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#fff',
              border: '1px solid #ffc0cb',
              color: '#d36ba6',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </a>

          <a
            href={partnerUid ? `/user/${encodeURIComponent(partnerUid)}` : '#'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '2px dashed #ffc0cb',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {partnerAvatar ? (
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  style={{
                    color: '#d36ba6',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                  }}
                >
                  No Img
                </span>
              )}
            </div>
            <strong
              style={{
                fontSize: '1.1rem',
                color: '#555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {partnerName}
            </strong>
          </a>
        </div>

        {partnerUid && (
          <a
            href={`/user/${encodeURIComponent(partnerUid)}`}
            style={{
              fontSize: '0.8rem',
              color: '#d36ba6',
              textDecoration: 'none',
              border: '1px dashed #ffc0cb',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: '#fff',
              flexShrink: 0,
              fontWeight: 'bold',
            }}
          >
            プロフィール
          </a>
        )}
      </div>

      {/* メッセージエリア */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: '#fffdfd',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#aaa', marginTop: '3rem' }}>
            まだメッセージはありません🍼<br />
            最初のメッセージを送ってみよう！
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: '8px',
                }}
              >
                {!isMe && (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      border: '2px dashed #ffc0cb',
                      backgroundColor: '#fffafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {partnerAvatar ? (
                      <img
                        src={partnerAvatar}
                        alt={partnerName}
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
                          fontSize: '0.55rem',
                          fontWeight: 'bold',
                        }}
                      >
                        🧸
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '72%',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    borderBottomRightRadius: isMe ? '4px' : '18px',
                    borderBottomLeftRadius: isMe ? '18px' : '4px',
                    backgroundColor: isMe ? '#eef9e6' : '#fffafc',
                    border: isMe ? '2px solid #b5f57c' : '2px solid #ffe0e6',
                    color: '#555',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textAlign: 'left',
                      fontSize: '0.95rem',
                      lineHeight: 1.5,
                      color: '#555',
                    }}
                  >
                    {msg.content}
                  </p>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      marginTop: '4px',
                      textAlign: 'right',
                      color: '#999',
                    }}
                  >
                    {msg.createdAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div
        style={{
          padding: '14px 18px',
          background: '#fffafc',
          borderTop: '2px dashed #ffc0cb',
        }}
      >
        {partnerChatDisabled ? (
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#999' }}>
            このおともだちは現在チャットの受付を停止しています。
          </p>
        ) : (
          <form
            onSubmit={handleSendMessage}
            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="メッセージを入力 (500文字まで)..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              maxLength={500}
              style={{
                flex: 1,
                borderRadius: '9999px',
                padding: '10px 18px',
                margin: 0,
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || cooldown}
              className="save-btn"
              style={{
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {sending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, LogIn } from 'lucide-react';
import { subscribeToMessages, sendMessage } from '../../lib/firebaseUtils';
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // リアルタイムリスナーの登録
    const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    return () => {
      unsubscribe(); // クリーンアップ
    };
  }, [roomId, currentUser]);

  // 新しいメッセージが来たら一番下までスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !currentUser) return;

    try {
      setSending(true);
      await sendMessage(roomId, currentUser.uid, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      alert('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-500 w-8 h-8" /></div>;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col h-[600px] max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm items-center justify-center p-8 text-center">
        <LogIn className="w-12 h-12 text-purple-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">ログインが必要です</h2>
        <p className="text-gray-500">チャットルームを閲覧・送信するにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex items-center">
        <h2 className="text-lg font-bold text-gray-800">チャットルーム</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">まだメッセージはありません</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                    isMe 
                      ? 'bg-purple-500 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-300 focus:bg-white transition-colors"
            placeholder="メッセージを入力..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

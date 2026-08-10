import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Share2, Loader2, User as UserIcon, Edit, Trash2 } from 'lucide-react';
import { getEventById, getUserProfile, deleteEvent } from '../../lib/firebaseUtils';
import type { EventModel, UserProfile } from '../../types/schema';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { EventComments } from './EventComments';
import { EventLikeButton } from './EventLikeButton';
import { useAuth } from '../../hooks/useAuth';

interface EventDetailProps {
  eventId: string;
}

export const EventDetail: React.FC<EventDetailProps> = ({ eventId }) => {
  const { currentUser } = useAuth();
  const [event, setEvent] = useState<EventModel | null>(null);
  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const fetchedEvent = await getEventById(eventId);
        if (!fetchedEvent) {
          setError('イベントが見つかりません。');
          return;
        }
        setEvent(fetchedEvent);

        if (fetchedEvent.organizerId) {
          const profile = await getUserProfile(fetchedEvent.organizerId);
          setOrganizer(profile);
        }
      } catch (err) {
        console.error("Failed to fetch event details", err);
        setError('イベント情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  const handleDelete = async () => {
    if (!window.confirm('本当にこのイベントを削除しますか？\nこの操作は元に戻せません。')) {
      return;
    }
    try {
      setDeleting(true);
      await deleteEvent(eventId);
      window.location.href = '/events';
    } catch (err) {
      console.error("Failed to delete event", err);
      alert('イベントの削除に失敗しました。');
      setDeleting(false);
    }
  };

  if (loading || deleting) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-pink-500 w-12 h-12" /></div>;
  }

  if (error || !event) {
    return <div className="text-center text-red-500 p-12 bg-red-50 rounded-2xl max-w-4xl mx-auto mt-12">{error}</div>;
  }

  const isOrganizer = currentUser?.uid === event.organizerId;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12">
      {/* Cover Image */}
      {event.coverImageUrl && (
        <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-sm mb-8">
          <img src={event.coverImageUrl} alt="Event Cover" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-6 md:p-10 mb-8 -mt-16 relative z-10 mx-4 md:mx-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex-1">{event.title}</h1>
          
          {isOrganizer && (
            <div className="flex space-x-2 flex-shrink-0">
              <a 
                href={`/events/${eventId}/edit`} 
                className="flex items-center space-x-1 px-4 py-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 transition-colors font-medium text-sm"
              >
                <Edit size={16} />
                <span>編集</span>
              </a>
              <button 
                onClick={handleDelete}
                className="flex items-center space-x-1 px-4 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors font-medium text-sm"
              >
                <Trash2 size={16} />
                <span>削除</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Organizer */}
        <div className="flex items-center mb-8 border-b pb-6">
          <a href={`/user?uid=${event.organizerId}`} className="flex items-center group cursor-pointer">
            {organizer?.profileImageUrl ? (
              <img src={organizer.profileImageUrl} alt="Organizer" className="w-12 h-12 rounded-full border-2 border-pink-100 object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-pink-100">
                <UserIcon className="text-gray-400" />
              </div>
            )}
            <div className="ml-3">
              <p className="text-sm text-gray-500">主催者</p>
              <p className="font-bold text-gray-900 group-hover:text-pink-500 transition-colors">{organizer?.displayName || '読み込み中...'}</p>
            </div>
          </a>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
          <div className="flex items-start space-x-3">
            <Calendar className="w-6 h-6 text-pink-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">日時</p>
              <p>
                {event.startDate && format(event.startDate, 'yyyy年MM月dd日 (E) HH:mm', { locale: ja })}<br />
                〜 {event.endDate && format(event.endDate, 'MM月dd日 (E) HH:mm', { locale: ja })}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <MapPin className="w-6 h-6 text-pink-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">開催場所</p>
              <p>{event.location}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Users className="w-6 h-6 text-pink-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-1">定員</p>
              <p>{event.maxAttendees}人</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (Blocks) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8">
        <h2 className="text-2xl font-bold mb-6 border-b pb-4">イベント詳細</h2>
        
        <div className="space-y-8">
          {event.contents && event.contents.length > 0 ? (
            event.contents.map((block) => (
              <div key={block.id} className="content-block">
                {block.type === 'text' && (
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{block.value}</p>
                )}
                {block.type === 'image' && (
                  <div className="flex justify-center rounded-xl overflow-hidden shadow-sm my-6">
                    <img src={block.value} alt="Event Content" className="max-w-full h-auto rounded-xl" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">詳細情報がまだありません。</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 mb-12">
        <EventLikeButton eventId={eventId} initialLikeCount={event.likeCount || 0} />
        
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: event.title,
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("URLをコピーしました！");
            }
          }}
          className="flex items-center text-gray-500 hover:text-blue-500 transition-colors"
        >
          <Share2 size={20} className="mr-2" /> シェア
        </button>
      </div>

      {/* Comments */}
      <EventComments eventId={eventId} />
    </div>
  );
};

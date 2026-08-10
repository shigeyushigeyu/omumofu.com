import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Heart, MessageCircle, Loader2, Plus, AlertTriangle, Info } from 'lucide-react';
import { getEvents } from '../../lib/firebaseUtils';
import type { EventModel } from '../../types/schema';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export const EventList: React.FC = () => {
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to fetch events", err);
        setError('イベントの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-pink-500 w-10 h-10" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl max-w-4xl mx-auto mt-8">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-6 md:p-10 mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center mb-4">
          <Calendar className="mr-3 text-pink-500 w-8 h-8" />
          おむもふイベント投稿
        </h2>
        <div className="text-gray-700 leading-relaxed space-y-2 mb-6">
          <p>ここでは、みんなのイベントを確認できるよ。<br/>気になるイベントはチェックしようね。</p>
        </div>

        <div className="flex justify-center my-8">
          <a 
            href="/events/new"
            className="save-btn"
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <Plus size={22} style={{ marginRight: '8px' }} />
            イベントを作成する
          </a>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-orange-800 text-sm space-y-2">
          <p className="flex items-start">
            <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            ※当サイトはR18（成人向け）のコンテンツを含みます。18歳未満の方のアクセスおよび閲覧は固くお断りいたします。
          </p>
          <p className="flex items-start">
            <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            当サイトはユーザー間のトラブルについて一切の責任を負いません。安全に配慮して交流をお楽しみください。
          </p>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center p-16 bg-white rounded-3xl shadow-sm border border-gray-100">
          <Calendar className="mx-auto text-gray-300 w-16 h-16 mb-4" />
          <p className="text-gray-600 font-medium text-lg mb-2">まだイベントが投稿されていません。</p>
          <p className="text-gray-500 mb-6">最初のイベントを投稿してみよう！</p>
          <a href="/events/new" className="inline-block bg-pink-100 text-pink-600 font-bold py-3 px-8 rounded-xl hover:bg-pink-200 transition-colors">
            イベントを投稿する
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <a 
              key={event.id} 
              href={`/events/${event.id}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full group cursor-pointer"
            >
              <div className="h-48 bg-pink-50 relative overflow-hidden flex-shrink-0">
                {event.coverImageUrl ? (
                  <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-pink-200" />
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg font-bold text-sm text-pink-600 shadow-sm">
                  {event.startDate && format(event.startDate, 'M/d (E)', { locale: ja })}
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-pink-600 transition-colors">
                  {event.title}
                </h3>
                
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                  {event.description || '詳細を見る...'}
                </p>

                <div className="mt-auto space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>
                      {event.startDate && format(event.startDate, 'HH:mm')} ~ {event.endDate && format(event.endDate, 'HH:mm')}
                    </span>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4 flex justify-end space-x-4">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Heart className="w-4 h-4 mr-1 text-pink-400" />
                    {event.likeCount || 0}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MessageCircle className="w-4 h-4 mr-1 text-blue-400" />
                    {event.commentCount || 0}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

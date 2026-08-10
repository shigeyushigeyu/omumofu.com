import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, AlertTriangle, Loader2, LogIn, Image as ImageIcon, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { createEvent, updateEvent, getEventById } from '../../lib/firebaseUtils';
import { useAuth } from '../../hooks/useAuth';
import { uploadImageToR2 } from '../../lib/uploadUtils';
import { v4 as uuidv4 } from 'uuid';
import type { EventContentBlock } from '../../types/schema';
import { format } from 'date-fns';

interface EventFormProps {
  eventId?: string;
}

export const EventForm: React.FC<EventFormProps> = ({ eventId }) => {
  const { currentUser, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    maxAttendees: 10,
  });
  
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  
  const [contents, setContents] = useState<EventContentBlock[]>([]);

  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!eventId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const ev = await getEventById(eventId);
        if (ev) {
          // Verify ownership (client side check)
          if (currentUser && ev.organizerId !== currentUser.uid) {
            setError('編集権限がありません。');
            setLoading(false);
            return;
          }
          setFormData({
            title: ev.title,
            description: ev.description || '',
            startDate: ev.startDate ? format(ev.startDate, "yyyy-MM-dd'T'HH:mm") : '',
            endDate: ev.endDate ? format(ev.endDate, "yyyy-MM-dd'T'HH:mm") : '',
            location: ev.location,
            maxAttendees: ev.maxAttendees || 10,
          });
          setCoverImagePreview(ev.coverImageUrl || null);
          setContents(ev.contents || []);
          // 編集時は免責事項は既に同意済みとみなす（もしくは再度チェックさせるか）
          setAgreedToDisclaimer(true);
        }
      } catch (err) {
        console.error("Failed to load event", err);
        setError("イベントの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) {
      fetchEvent();
    }
  }, [eventId, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const addTextBlock = () => {
    setContents([...contents, { id: uuidv4(), type: 'text', value: '' }]);
  };

  const addImageBlock = () => {
    // For the form state, we just store the file object temporarily in value, or handle upload on submit.
    // To make it simple: we store a special marker or just allow them to pick an image, 
    // but React needs a way to hold the file. Let's store a base64 preview in value, and keep the File in a separate state, 
    // OR just upload the image immediately when added to block. Uploading immediately is better UX.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setSubmitting(true);
        const { publicUrl } = await uploadImageToR2(file, `events/${currentUser?.uid}/${uuidv4()}`);
        setContents(prev => [...prev, { id: uuidv4(), type: 'image', value: publicUrl }]);
      } catch (err) {
        console.error("Image upload failed", err);
        setError('画像のアップロードに失敗しました。');
      } finally {
        setSubmitting(false);
      }
    };
    input.click();
  };

  const updateBlockValue = (id: string, value: string) => {
    setContents(contents.map(block => block.id === id ? { ...block, value } : block));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === contents.length - 1) return;
    
    const newContents = [...contents];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newContents[index], newContents[swapIndex]] = [newContents[swapIndex], newContents[index]];
    setContents(newContents);
  };

  const removeBlock = (id: string) => {
    setContents(contents.filter(block => block.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    if (!agreedToDisclaimer) {
      setError('免責事項への同意が必要です。');
      return;
    }
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.location) {
      setError('必須項目をすべて入力してください。');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      let coverImageUrl = eventId ? (coverImagePreview && !coverImageFile ? coverImagePreview : undefined) : undefined;
      if (coverImageFile) {
        const { publicUrl } = await uploadImageToR2(coverImageFile, `events/${currentUser.uid}/${uuidv4()}`);
        coverImageUrl = publicUrl;
      }
      
      const eventPayload = {
        title: formData.title,
        description: formData.description,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        location: formData.location,
        maxAttendees: Number(formData.maxAttendees),
        contents,
      };

      if (eventId) {
        await updateEvent(eventId, coverImageUrl ? { ...eventPayload, coverImageUrl } : eventPayload);
      } else {
        await createEvent({
          ...eventPayload,
          organizerId: currentUser.uid,
          coverImageUrl,
        });
      }

      setSuccess(true);
      if (!eventId) {
        setFormData({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          location: '',
          maxAttendees: 10,
        });
        setContents([]);
        setCoverImageFile(null);
        setCoverImagePreview(null);
        setAgreedToDisclaimer(false);
      } else {
        setTimeout(() => {
          window.location.href = `/events/${eventId}`;
        }, 1500);
      }
      
    } catch (err) {
      console.error(err);
      setError(eventId ? 'イベントの更新に失敗しました。' : 'イベントの作成に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-pink-500 w-8 h-8" /></div>;

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-sm border border-pink-100 text-center">
        <LogIn className="w-12 h-12 text-pink-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">ログインが必要です</h2>
        <p className="text-gray-500">イベントを企画するにはログインしてください。</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-8 bg-green-50 border border-green-200 rounded-2xl text-center">
        <h3 className="text-2xl font-bold text-green-700 mb-4">イベントを作成しました！</h3>
        <p className="text-green-600 mb-6">参加者の募集を開始しました。</p>
        <button 
          onClick={() => setSuccess(false)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          続けて作成する
        </button>
      </div>
    );
  }

  return (
    <div className="profile-card max-w-3xl mx-auto">
      <div className="user-header">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center">
          <Calendar className="mr-3 text-pink-500 w-6 h-6" />
          新しいイベント・オフ会を企画する
        </h2>
      </div>

      {error && <p className="status-text error">{error}</p>}

      <form onSubmit={handleSubmit} className="profile-form mt-6">
        
        {/* カバー画像アップロード (上部に大きく表示) */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div 
            onClick={() => document.getElementById('coverImage')?.click()}
            style={{
              width: '100%',
              height: '250px',
              border: '4px dashed #ffc0cb',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#fffafb',
              margin: '0 auto'
            }}
          >
            {coverImagePreview ? (
              <img src={coverImagePreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#d36ba6', fontSize: '1.2rem', fontWeight: 'bold' }}>画像を選択</span>
            )}
          </div>
          <input 
            type="file" 
            id="coverImage" 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleCoverImageChange} 
          />
        </div>

        {/* イベント名 */}
        <div className="form-group card">
          <label className="section-label">イベント名 <span className="text-red-500">*</span></label>
          <input 
            type="text" name="title" required placeholder="例: 都内おむもふ会"
            value={formData.title} onChange={handleChange}
          />
        </div>

        {/* 概要文 */}
        <div className="form-group card">
          <label className="section-label">概要文 (一覧表示用)</label>
          <textarea 
            name="description" rows={3} placeholder="イベントの簡単な説明"
            value={formData.description} onChange={handleChange}
          />
        </div>

        {/* 日時 */}
        <div className="form-group card">
          <h2 className="section-label">開催日時 <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
              <label className="section-desc font-bold flex items-center mb-2">
                <Calendar className="w-4 h-4 mr-1 text-pink-400" /> 開始日時
              </label>
              <input 
                type="datetime-local" name="startDate" required
                value={formData.startDate} onChange={handleChange}
              />
            </div>
            <div>
              <label className="section-desc font-bold flex items-center mb-2">
                <Calendar className="w-4 h-4 mr-1 text-pink-400" /> 終了日時
              </label>
              <input 
                type="datetime-local" name="endDate" required
                value={formData.endDate} onChange={handleChange}
              />
            </div>
          </div>
        </div>
          
        {/* 場所・定員 */}
        <div className="form-group card">
          <h2 className="section-label">場所と定員</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
              <label className="section-desc font-bold flex items-center mb-2">
                <MapPin className="w-4 h-4 mr-1 text-pink-400" /> 開催場所 <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" name="location" required placeholder="例: 新宿区某所"
                value={formData.location} onChange={handleChange}
              />
            </div>
            <div>
              <label className="section-desc font-bold flex items-center mb-2">
                <Users className="w-4 h-4 mr-1 text-pink-400" /> 定員
              </label>
              <input 
                type="number" name="maxAttendees" min="2" max="100"
                value={formData.maxAttendees} onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* 詳細コンテンツ (ブロックエディタ) */}
        <div className="form-group card">
          <h2 className="section-label">詳細コンテンツ</h2>
          <p className="section-desc">イベントの詳細な説明、スケジュール、持ち物などを追加してください。</p>
          
          <div className="space-y-4 mt-4">
            {contents.map((block, index) => (
              <div key={block.id} className="relative group border border-pink-100 rounded-2xl p-5 bg-pink-50/50 shadow-sm">
                <div className="absolute -top-3 -right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-2 bg-white border border-pink-200 hover:bg-pink-100 rounded-full text-pink-400 disabled:opacity-30 shadow-sm transition-all hover:scale-110"><ArrowUp size={16}/></button>
                  <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === contents.length - 1} className="p-2 bg-white border border-pink-200 hover:bg-pink-100 rounded-full text-pink-400 disabled:opacity-30 shadow-sm transition-all hover:scale-110"><ArrowDown size={16}/></button>
                  <button type="button" onClick={() => removeBlock(block.id)} className="p-2 bg-white border border-red-200 hover:bg-red-100 rounded-full text-red-400 shadow-sm transition-all hover:scale-110"><Trash2 size={16}/></button>
                </div>
                
                {block.type === 'text' && (
                  <textarea
                    rows={4}
                    placeholder="テキストを入力..."
                    value={block.value}
                    onChange={(e) => updateBlockValue(block.id, e.target.value)}
                    className="w-full bg-transparent outline-none resize-y border-none focus:ring-0 p-0 text-gray-700"
                    style={{ border: 'none', backgroundColor: 'transparent' }}
                  />
                )}
                
                {block.type === 'image' && (
                  <div className="flex justify-center mt-2">
                    <img src={block.value} alt="Content Block" className="max-h-80 max-w-full rounded-xl shadow-sm object-contain" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button 
              type="button" 
              onClick={addTextBlock} 
              className="option-card flex-1"
              style={{ justifyContent: 'center', alignItems: 'center', padding: '16px' }}
            >
              <Plus size={22} color="#d36ba6" className="mr-2" />
              <span className="font-bold text-pink-700 text-lg">テキストを追加</span>
            </button>
            <button 
              type="button" 
              onClick={addImageBlock} 
              disabled={submitting} 
              className="option-card flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ justifyContent: 'center', alignItems: 'center', padding: '16px' }}
            >
              <ImageIcon size={22} color="#d36ba6" className="mr-2" />
              <span className="font-bold text-pink-700 text-lg">画像を追加</span>
            </button>
          </div>
        </div>

        {/* 必須: トラブル免責事項の同意 */}
        <div className="form-group card">
          <h2 className="section-label">【重要】免責事項への同意 <span className="text-red-500">*</span></h2>
          <label className="option-card checkbox-label mt-4">
            <input 
              type="checkbox" 
              checked={agreedToDisclaimer}
              onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
            />
            <span className="option-content">
              <strong className="option-title text-orange-800">同意します</strong>
              <span className="option-desc text-orange-700">
                ユーザー間でのオフラインのトラブルについて、運営はいかなる責任も負わないものとします。参加者の選定や当日の安全管理は主催者の自己責任で行うことに同意します。
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-center mt-8">
          <button 
            type="submit" 
            disabled={!agreedToDisclaimer || submitting || loading}
            className="save-btn"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {submitting ? <Loader2 className="animate-spin mr-2" size={20} /> : <Plus className="mr-2" size={20} />}
            {submitting ? '処理中...' : (eventId ? 'イベントを更新する' : 'イベントを作成する')}
          </button>
        </div>
      </form>
    </div>
  );
};

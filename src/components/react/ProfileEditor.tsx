import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, Loader2, LogIn } from 'lucide-react';
import { uploadImageToR2 } from '../../lib/uploadUtils';
import { getUserProfile, updateUserProfile } from '../../lib/firebaseUtils';
import type { UserProfile } from '../../types/schema';
import { useAuth } from '../../hooks/useAuth';
import { KOKORO_OPTIONS, TOKIMEKI_OPTIONS, KOKORO_CATEGORIES } from '../../data/profileOptions';

export const ProfileEditor: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    displayName: '',
    bio: '',
    profileImageUrl: '',
    tags: [],
    kokoro: '',
    tokimeki: [],
    privacySettings: { searchable: true, chatAcceptance: 'all' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
        } else {
          setProfile(prev => ({ ...prev, displayName: currentUser.displayName || '' }));
        }
      } catch (err) {
        setError('プロフィールの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser, authLoading]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const previewUrl = URL.createObjectURL(file);
    setProfile(prev => ({ ...prev, profileImageUrl: previewUrl }));

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const { publicUrl } = await uploadImageToR2(file, `avatars/${currentUser.uid}`);
      setProfile(prev => ({ ...prev, profileImageUrl: publicUrl }));
      await updateUserProfile(currentUser.uid, { profileImageUrl: publicUrl });
      setSuccess('プロフィール画像を更新しました！');
    } catch (err: any) {
      console.error(err);
      setError('画像のアップロードに失敗しました');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const dataToUpdate = {
        displayName: profile.displayName ?? '',
        bio: profile.bio ?? '',
        tags: profile.tags ?? [],
        kokoro: profile.kokoro ?? '',
        tokimeki: profile.tokimeki ?? [],
        privacySettings: profile.privacySettings ?? { searchable: true, chatAcceptance: 'all' }
      };

      await updateUserProfile(currentUser.uid, dataToUpdate);
      setSuccess('設定を保存しました！');
    } catch (err) {
      console.error(err);
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    
    const newTags = newTag.split(',').map(t => t.trim()).filter(Boolean);
    setProfile(prev => {
      const currentTags = prev.tags || [];
      const combined = [...currentTags, ...newTags];
      return { ...prev, tags: Array.from(new Set(combined)) };
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tagToRemove)
    }));
  };

  const toggleTokimeki = (id: string) => {
    setProfile(prev => {
      const current = prev.tokimeki || [];
      if (current.includes(id)) {
        return { ...prev, tokimeki: current.filter(t => t !== id) };
      } else {
        return { ...prev, tokimeki: [...current, id] };
      }
    });
  };

  if (authLoading || loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" color="#ffc0cb" size={32} /></div>;
  }

  if (!currentUser) {
    return (
      <div className="profile-card" style={{ textAlign: 'center' }}>
        <LogIn size={48} color="#ffc0cb" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#333' }}>ログインが必要です</h2>
        <p style={{ color: '#888' }}>プロフィールを編集するにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="user-header">
        <h1>プロフィール設定</h1>
        <p className="email-text">{currentUser.email}</p>
      </div>

      {error && <p className="status-text error">{error}</p>}
      {success && <p className="status-text success">{success}</p>}

      {/* アバターアップロード (ユーザー画面に統合) */}
      <div className="avatar-upload-container">
        <div className="avatar-preview" onClick={() => fileInputRef.current?.click()}>
          {profile.profileImageUrl ? (
            <img src={profile.profileImageUrl} alt="Avatar" />
          ) : (
            <span style={{ color: '#d36ba6', fontSize: '0.9rem', fontWeight: 'bold' }}>No Image</span>
          )}
          <div className="avatar-overlay">
            <Camera color="white" size={40} />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleImageChange} 
          disabled={saving}
        />
        <div className="avatar-hint">タップしてプロフィール画像を変更</div>
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <div className="form-group card">
          <label className="section-label">ディスプレイネーム</label>
          <input 
            type="text" 
            required
            value={profile.displayName || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="表示名を入力..."
            maxLength={50}
          />
        </div>

        <div className="form-group card">
          <label className="section-label">簡単な自己紹介</label>
          <textarea 
            rows={4}
            value={profile.bio || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="自己紹介やリトルとして好きなことを書いてね..."
            maxLength={500}
          />
        </div>

        <div className="form-group card">
          <h2 className="section-label">こころのすがた (自認タイプ)</h2>
          <p className="section-desc">あなたに一番しっくりくるすがたを1つ選んでね。</p>
          
          {KOKORO_CATEGORIES.map(cat => (
            <div key={cat} className="category-group">
              <h3 className="category-title">{cat}</h3>
              <div className="options-grid">
                {KOKORO_OPTIONS.filter(opt => opt.category === cat).map(opt => {
                  const isSelected = profile.kokoro === opt.id;
                  return (
                    <label key={opt.id} className="option-card radio-label">
                      <input 
                        type="radio" 
                        name="kokoro" 
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setProfile(prev => ({ ...prev, kokoro: opt.id }))}
                      />
                      <span className="option-content">
                        <strong className="option-title">{opt.label}</strong>
                        <span className="option-desc">{opt.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="form-group card">
          <h2 className="section-label">ときめきスタイル (フェチ・嗜好)</h2>
          <p className="section-desc">あなたがときめく・好きなスタイルを選んでね（複数選択可）。</p>
          
          <div className="options-grid">
            {TOKIMEKI_OPTIONS.map(opt => {
              const isSelected = profile.tokimeki?.includes(opt.id);
              return (
                <label key={opt.id} className="option-card checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={isSelected || false}
                    onChange={() => toggleTokimeki(opt.id)}
                  />
                  <span className="option-content">
                    <strong className="option-title">{opt.label}</strong>
                    <span className="option-desc">{opt.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group card">
          <h2 className="section-label">プライバシーとタグ設定</h2>
          <p className="section-desc">好きなものや興味のあるタグを追加してね</p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              type="text" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // フォーム送信を防ぐ
                  handleAddTag();
                }
              }}
              placeholder="おむつ, ぬいぐるみ, 映画"
              maxLength={20}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button 
              type="button" 
              onClick={handleAddTag}
              className="save-btn" 
              style={{ width: 'auto', padding: '0 20px', borderRadius: '12px' }}
            >
              追加
            </button>
          </div>
          
          {profile.tags && profile.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '25px' }}>
              {profile.tags.map(tag => (
                <span key={tag} style={{ 
                  background: '#fffafc', 
                  border: '1px solid #ffc0cb', 
                  padding: '6px 14px', 
                  borderRadius: '9999px',
                  fontSize: '0.95rem',
                  color: '#d36ba6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 'bold'
                }}>
                  #{tag}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTag(tag)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#f78fb3', 
                      cursor: 'pointer', 
                      fontSize: '1.2rem', 
                      padding: 0, 
                      lineHeight: 1,
                      marginLeft: '2px'
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: '1.05rem', color: '#a05585', fontWeight: 'bold', marginBottom: '10px' }}>検索・一覧表示の許可</h3>
          <p className="section-desc">オンにすると、他のユーザーがあなたを見つけやすくなります。</p>
          <label className="option-card checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px' }}>
            <input 
              type="checkbox" 
              checked={profile.privacySettings?.searchable ?? true}
              onChange={(e) => setProfile(prev => ({
                ...prev, 
                privacySettings: { ...prev.privacySettings!, searchable: e.target.checked }
              }))}
            />
            <span className="option-content">
              <strong className="option-title">プロフィールを公開して検索を許可する</strong>
            </span>
          </label>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '15px' }}>
          <button 
            type="submit" 
            disabled={saving}
            className="save-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}
          >
            {saving ? <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} /> : <Save size={20} style={{ marginRight: '8px' }} />}
            設定を保存する
          </button>
          <button
            type="button"
            onClick={() => {
              import('../../lib/firebase').then(({ auth }) => {
                import('firebase/auth').then(({ signOut }) => {
                  signOut(auth).then(() => {
                    window.location.href = '/login';
                  });
                });
              });
            }}
            className="logout-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}
          >
            ログアウト
          </button>
        </div>
      </form>
    </div>
  );
};

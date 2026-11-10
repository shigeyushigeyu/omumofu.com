import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types/schema';
import {
  KOKORO_OPTIONS,
  TOKIMEKI_OPTIONS,
  KOKORO_CATEGORIES,
  KOKORO_MAP,
  TOKIMEKI_MAP,
} from '../../data/profileOptions';

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKokoro, setSelectedKokoro] = useState<string[]>([]);
  const [selectedTokimeki, setSelectedTokimeki] = useState<string[]>([]);
  const [openKokoroFilter, setOpenKokoroFilter] = useState(false);
  const [openTokimekiFilter, setOpenTokimekiFilter] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // 検索許可 (privacySettings.searchable === true) のユーザーのみ取得（最大100件制限で大量読み取り防止）
        const q = query(
          collection(db, 'users'),
          where('privacySettings.searchable', '==', true),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const fetchedUsers: UserProfile[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          // クライアント側でも searchable === true を厳密にチェック
          if (data?.privacySettings?.searchable !== true) return;

          // メールアドレス等の非公開情報は絶対に保持・表示しないよう必要なフィールドのみ抽出
          fetchedUsers.push({
            uid: docSnap.id,
            displayName: data.displayName || '名無しのおともだち',
            profileImageUrl: data.profileImageUrl || '',
            bio: data.bio || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            kokoro: data.kokoro || '',
            tokimeki: Array.isArray(data.tokimeki) ? data.tokimeki : [],
            privacySettings: {
              searchable: true,
              chatAcceptance: data.privacySettings?.chatAcceptance || 'all',
            },
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          });
        });

        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleKokoro = (id: string) => {
    setSelectedKokoro((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTokimeki = (id: string) => {
    setSelectedTokimeki((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedKokoro([]);
    setSelectedTokimeki([]);
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      // 1. 検索許可の再確認
      if (user.privacySettings?.searchable !== true) return false;

      // 2. フリーワード検索（ディスプレイネーム・タグ・自己紹介）
      if (keyword) {
        const matchName = user.displayName?.toLowerCase().includes(keyword);
        const matchBio = user.bio?.toLowerCase().includes(keyword);
        const matchTags = user.tags?.some((tag) =>
          tag.toLowerCase().includes(keyword)
        );
        if (!matchName && !matchBio && !matchTags) return false;
      }

      // 3. こころのすがた検索（選択されたいずれかに一致）
      if (selectedKokoro.length > 0) {
        if (!user.kokoro || !selectedKokoro.includes(user.kokoro)) {
          return false;
        }
      }

      // 4. ときめきスタイル検索（選択されたすべてを含む）
      if (selectedTokimeki.length > 0) {
        const userTokimeki = user.tokimeki || [];
        const hasAll = selectedTokimeki.every((id) => userTokimeki.includes(id));
        if (!hasAll) return false;
      }

      return true;
    });
  }, [users, searchTerm, selectedKokoro, selectedTokimeki]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedKokoro.length > 0 ||
    selectedTokimeki.length > 0;

  return (
    <div className="profile-card">
      <div className="user-header" style={{ marginBottom: '25px' }}>
        <h1>おともだち検索</h1>
        <p className="section-desc" style={{ marginTop: '8px', marginBottom: 0 }}>
          プロフィールを公開しているおともだちを、名前やオプションから探せるよ🍼
        </p>
      </div>

      {/* 検索・フィルターエリア */}
      <div className="profile-form" style={{ marginBottom: '35px' }}>
        {/* 1. キーワード検索 */}
        <div className="form-group card">
          <label className="section-label">キーワードでさがす</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="ディスプレイネームやタグで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '42px' }}
            />
            <Search
              size={20}
              color="#d36ba6"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* 2. こころのすがた (KOKORO_OPTIONS) で絞り込み */}
        <div className="form-group card">
          <button
            type="button"
            onClick={() => setOpenKokoroFilter((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div>
              <span className="section-label" style={{ marginBottom: '4px' }}>
                🍼 こころのすがたで絞り込む
                {selectedKokoro.length > 0 && (
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '0.85rem',
                      backgroundColor: '#eef9e6',
                      color: '#8cc63f',
                      border: '1px dashed #b5f57c',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                    }}
                  >
                    {selectedKokoro.length}件選択中
                  </span>
                )}
              </span>
              <p className="section-desc" style={{ margin: 0 }}>
                気になる自認タイプを選んでね（複数選択可）
              </p>
            </div>
            {openKokoroFilter ? (
              <ChevronUp color="#d36ba6" size={24} />
            ) : (
              <ChevronDown color="#d36ba6" size={24} />
            )}
          </button>

          {openKokoroFilter && (
            <div style={{ marginTop: '20px' }}>
              {KOKORO_CATEGORIES.map((cat) => (
                <div key={cat} className="category-group">
                  <h3 className="category-title">{cat}</h3>
                  <div className="options-grid">
                    {KOKORO_OPTIONS.filter((opt) => opt.category === cat).map(
                      (opt) => {
                        const isSelected = selectedKokoro.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className="option-card checkbox-label"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleKokoro(opt.id)}
                            />
                            <span className="option-content">
                              <strong className="option-title">
                                {opt.label}
                              </strong>
                              <span className="option-desc">{opt.desc}</span>
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. ときめきスタイル (TOKIMEKI_OPTIONS) で絞り込み */}
        <div className="form-group card">
          <button
            type="button"
            onClick={() => setOpenTokimekiFilter((prev) => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div>
              <span className="section-label" style={{ marginBottom: '4px' }}>
                ✨ ときめきスタイルで絞り込む
                {selectedTokimeki.length > 0 && (
                  <span
                    style={{
                      marginLeft: '10px',
                      fontSize: '0.85rem',
                      backgroundColor: '#eef9e6',
                      color: '#8cc63f',
                      border: '1px dashed #b5f57c',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                    }}
                  >
                    {selectedTokimeki.length}件選択中
                  </span>
                )}
              </span>
              <p className="section-desc" style={{ margin: 0 }}>
                好きなスタイル・嗜好を選んでね（複数選択可）
              </p>
            </div>
            {openTokimekiFilter ? (
              <ChevronUp color="#d36ba6" size={24} />
            ) : (
              <ChevronDown color="#d36ba6" size={24} />
            )}
          </button>

          {openTokimekiFilter && (
            <div className="options-grid" style={{ marginTop: '20px' }}>
              {TOKIMEKI_OPTIONS.map((opt) => {
                const isSelected = selectedTokimeki.includes(opt.id);
                return (
                  <label key={opt.id} className="option-card checkbox-label">
                    <input
                      type="checkbox"
                      checked={isSelected}
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
          )}
        </div>

        {/* 選択中のフィルター表示 & クリアボタン */}
        {hasActiveFilters && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#fffafc',
              border: '2px dotted #ffc0cb',
              borderRadius: '14px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#a05585', fontWeight: 'bold' }}>
                選択中の条件:
              </span>
              {selectedKokoro.map((id) => (
                <span
                  key={`kokoro-${id}`}
                  onClick={() => toggleKokoro(id)}
                  style={{
                    background: '#fff',
                    border: '1px solid #ffc0cb',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    color: '#d36ba6',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="クリックで解除"
                >
                  🍼 {KOKORO_MAP[id]?.label || id} ×
                </span>
              ))}
              {selectedTokimeki.map((id) => (
                <span
                  key={`tokimeki-${id}`}
                  onClick={() => toggleTokimeki(id)}
                  style={{
                    background: '#fafffa',
                    border: '1px solid #b5f57c',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    color: '#6ca329',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                  title="クリックで解除"
                >
                  {TOKIMEKI_MAP[id]?.label || id} ×
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="logout-btn"
              style={{
                padding: '6px 16px',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RotateCcw size={14} />
              条件をクリア
            </button>
          </div>
        )}
      </div>

      {/* 検索結果件数 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '0 4px',
        }}
      >
        <h2
          className="section-label"
          style={{ margin: 0, fontSize: '1.25rem' }}
        >
          おともだち一覧 ({filteredUsers.length}人)
        </h2>
      </div>

      {/* 一覧表示（プロフィール画像とディスプレイネーム） */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '3rem 0',
          }}
        >
          <Loader2 className="animate-spin" color="#ffc0cb" size={36} />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: '#888',
          }}
        >
          <p style={{ margin: 0, fontSize: '1.05rem' }}>
            条件にぴったりのおともだちが見つかりませんでした🧸
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredUsers.map((user) => (
            <a
              key={user.uid}
              href={`/user/${encodeURIComponent(user.uid)}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#ffffff',
                border: '2px dashed #ffc0cb',
                borderRadius: '18px',
                padding: '24px 16px',
                boxShadow: '0 4px 12px rgba(180, 120, 140, 0.06)',
                transition: 'all 0.25s ease',
                textAlign: 'center',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow =
                  '0 8px 20px rgba(255, 192, 203, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(180, 120, 140, 0.06)';
              }}
            >
              {/* プロフィール画像 */}
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '3px dashed #ffc0cb',
                  backgroundColor: '#fffafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginBottom: '14px',
                  flexShrink: 0,
                }}
              >
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.displayName}
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
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    }}
                  >
                    No Image
                  </span>
                )}
              </div>

              {/* ディスプレイネーム */}
              <strong
                style={{
                  fontSize: '1.1rem',
                  color: '#555',
                  fontWeight: 'bold',
                  wordBreak: 'break-word',
                  marginBottom: '8px',
                }}
              >
                {user.displayName || '名無しのおともだち'}
              </strong>

              {/* こころのすがたミニラベル（設定されている場合） */}
              {user.kokoro && KOKORO_MAP[user.kokoro] && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#fffafc',
                    border: '1px solid #ffe0e6',
                    color: '#a05585',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    marginBottom: '6px',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {KOKORO_MAP[user.kokoro].label}
                </span>
              )}

              <span
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  fontSize: '0.85rem',
                  color: '#d36ba6',
                  fontWeight: 'bold',
                }}
              >
                プロフィールを見る →
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Camera, X, Loader2 } from 'lucide-react';
import { uploadImageToR2 } from '../../../lib/uploadUtils';
import { createPost } from '../../../lib/firebaseUtils';

interface CreatePostModalProps {
  currentUser: User;
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ currentUser, onClose }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    const newTags = newTag.split(',').map(t => t.trim()).filter(Boolean);
    setTags(prev => Array.from(new Set([...prev, ...newTags])));
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setError('画像を選択してください🎀');
      return;
    }
    if (!content.trim()) {
      setError('キャプションを入力してください🎀');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Upload image to R2
      const path = `posts/${currentUser.uid}/${Date.now()}`;
      const { publicUrl } = await uploadImageToR2(imageFile, path);

      // Create post document
      await createPost({
        authorId: currentUser.uid,
        type: 'image',
        title: '',
        content,
        imageUrls: [publicUrl],
        tags,
        isR18: false,
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError('投稿に失敗しました');
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }} onClick={onClose}>
      
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ textAlign: 'center', margin: '25px 0 15px', color: '#4a3e3d', fontSize: '1.5rem' }}>新規投稿 🎀</h2>

        <form onSubmit={handleSubmit} style={{ padding: '0 25px 30px' }}>
          
          {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</div>}

          {/* Image Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', aspectRatio: '1/1', backgroundColor: '#f7f3f0', borderRadius: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: '2px dashed #ffc0cb', marginBottom: '20px', overflow: 'hidden', position: 'relative'
            }}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '8px', borderRadius: '50%', color: 'white' }}>
                  <Camera size={20} />
                </div>
              </>
            ) : (
              <>
                <Camera size={48} color="#ffc0cb" style={{ marginBottom: '10px' }} />
                <span style={{ color: '#d36ba6', fontWeight: 'bold' }}>画像をえらぶ</span>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
          </div>

          {/* Caption */}
          <div style={{ marginBottom: '20px' }}>
            <textarea
              placeholder="どんなおしゃしん？おはなしをかいてね..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '15px', border: '2px dotted #ffc0cb', borderRadius: '12px',
                fontSize: '1rem', boxSizing: 'border-box', backgroundColor: '#fffafc', outline: 'none', color: '#555'
              }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="タグ (例: おむつ)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                style={{ flex: 1, padding: '10px 15px', border: '2px dotted #ffc0cb', borderRadius: '12px', outline: 'none' }}
              />
              <button type="button" onClick={handleAddTag} style={{ background: '#eef9e6', color: '#8cc63f', border: '2px dashed #b5f57c', borderRadius: '12px', padding: '0 20px', fontWeight: 'bold', cursor: 'pointer' }}>追加</button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map(tag => (
                <span key={tag} style={{ background: '#fffafc', border: '1px solid #ffc0cb', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.85rem', color: '#d36ba6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  #{tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#f78fb3', cursor: 'pointer', padding: 0 }}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            style={{
              width: '100%', padding: '15px', borderRadius: '9999px', border: 'none',
              background: '#ffc0cb', color: 'white', fontSize: '1.1rem', fontWeight: 'bold',
              cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            {uploading ? <Loader2 className="animate-spin" size={24} /> : '投稿する'}
          </button>
        </form>
      </div>
    </div>
  );
};

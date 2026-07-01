// src/data/galleryThemes.ts

export interface GalleryTheme {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  coverImage: string; // カバー画像ID（例: "0021"）
  imageIds: string[]; // 画像ファイル名（例: "0021", "0020", ...）
}

// 現在はグループが1つだけ定義されています。
export const GALLERY_THEMES: GalleryTheme[] = [
  {
    id: 'pastel',
    title: 'ぱすてる・ファンタジー',
    desc: 'パステルアートを集めました。',
    emoji: '🍼',
    coverImage: '0021', // カバー画像ID (0021.png)
    imageIds: Array.from({ length: 21 }, (_, i) => (21 - i).toString().padStart(4, '0'))
  }
];

export const THEMES_MAP = Object.fromEntries(GALLERY_THEMES.map(theme => [theme.id, theme]));

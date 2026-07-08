// src/data/galleryThemes.ts

export interface GalleryTheme {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  coverImage: string; // カバー画像ID（例: "0021"）
  imageIds: string[]; // 画像ファイル名（例: "0021", "0020", ...）
}

// 現在はグループが定義されています。
export const GALLERY_THEMES: GalleryTheme[] = [
  {
    id: 'pastel',
    title: 'ぱすてる・ファンタジー',
    desc: 'パステルアートを集めました。',
    emoji: '🍼',
    coverImage: '678',
    imageIds: [
      '678', '677', '667', '666', '665', '664',
      ...Array.from({ length: 21 }, (_, i) => (21 - i).toString().padStart(4, '0'))
    ]
  },
  {
    id: 'rosegarden',
    title: 'ローズガーデン',
    desc: '薔薇が咲き誇る美しいお庭の世界観だよ。',
    emoji: '🌹',
    coverImage: '280',
    imageIds: ['280', '279', '278', '277', '276', '275', '274', '273', '272', '271', '037']
  },
  {
    id: 'cozy',
    title: 'コージー・ルーム',
    desc: 'あたたかくて心地よいお部屋の雰囲気の画像だよ。',
    emoji: '🧸',
    coverImage: '165',
    imageIds: ['214', '211', '176', '172', '171', '170', '165']
  },
  {
    id: 'ElementarySchoolStudentSgirl',
    title: '小学生・スクールガール',
    desc: '懐かしくてかわいいスクールガールスタイルのお写真だよ。',
    emoji: '🎒',
    coverImage: '616',
    imageIds: ['616']
  },
  {
    id: 'loli',
    title: 'ロリータ・ファンシー',
    desc: 'フリルとレースに囲まれた、夢のようなロリータの世界。',
    emoji: '👗',
    coverImage: '548',
    imageIds: ['560', '548', '546', '159', '148', '139']
  },
  {
    id: 'miko',
    title: '和風・巫女',
    desc: '厳かな和の雰囲気と可憐な巫女装束。',
    emoji: '⛩️',
    coverImage: '838',
    imageIds: ['838', '837', '836', '835', '834', '833', '832']
  },
  {
    id: 'toilet',
    title: 'お便所・おむつ交換台',
    desc: 'ちょっとドキドキするおむつ交換シチュエーション。',
    emoji: '🚽',
    coverImage: '540',
    imageIds: ['545', '544', '543', '542', '541', '540', '539', '538', '537', '536']
  },
  {
    id: 'twogirls',
    title: 'ふたりでおむもふ',
    desc: '仲良く寄り添うふたりのおむもふショット。',
    emoji: '👭',
    coverImage: '432',
    imageIds: ['437', '435', '432']
  }
];

export const THEMES_MAP = Object.fromEntries(GALLERY_THEMES.map(theme => [theme.id, theme]));


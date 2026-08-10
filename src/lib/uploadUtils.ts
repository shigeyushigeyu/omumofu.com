import imageCompression from 'browser-image-compression';

export interface UploadResult {
  publicUrl: string;
  fileName: string;
}

/**
 * クライアントサイドで画像を圧縮し、Cloudflare R2に直接アップロードする
 * 
 * @param file アップロードする画像ファイル
 * @param folder R2内の保存先フォルダ（デフォルト: 'uploads'）
 * @returns 成功時にパブリックURLとファイル名を含むオブジェクトを返す
 */
export const uploadImageToR2 = async (file: File, folder = 'uploads'): Promise<UploadResult> => {
  try {
    // 1. 画像圧縮オプション
    const options = {
      maxSizeMB: 1, // 1MB以下に圧縮
      maxWidthOrHeight: 1920, // 最大幅・高さ
      useWebWorker: true,
      fileType: file.type // 元のファイル形式を維持 (JPEG, PNG, WebPなど)
    };

    console.log(`Original file size: ${file.size / 1024 / 1024} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed file size: ${compressedFile.size / 1024 / 1024} MB`);

    // 2. 署名付きURLをバックエンド(Astro API)から取得
    const response = await fetch('/api/get-presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileType: compressedFile.type,
        folder
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch presigned URL');
    }

    const { url, publicUrl, fileName } = await response.json();

    // 3. R2へPUTリクエストで直接アップロード
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': compressedFile.type,
      },
      body: compressedFile, // 圧縮したファイルを送信
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to R2');
    }

    return { publicUrl, fileName };

  } catch (error) {
    console.error('Error during image upload:', error);
    throw error;
  }
};

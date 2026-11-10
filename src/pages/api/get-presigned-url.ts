import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// 許可する画像MIMEタイプのホワイトリスト
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// 許可するアップロード先フォルダのプレフィックス
const ALLOWED_FOLDER_PREFIXES = ['avatars/', 'posts/', 'events/', 'uploads'];

// IP単位の簡易レートリミット（1分間に最大10回まで）
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      clientAddress ||
      'unknown';

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'アップロード回数の上限に達しました。少し待ってから再度お試しください。' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { fileType, folder = 'uploads' } = body;

    if (!fileType || typeof fileType !== 'string' || !(fileType in ALLOWED_MIME_TYPES)) {
      return new Response(
        JSON.stringify({ error: '許可されていないファイル形式です（JPEG, PNG, WebP, GIFのみ対応）' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (
      typeof folder !== 'string' ||
      folder.includes('..') ||
      !/^[a-zA-Z0-9/_-]+$/.test(folder) ||
      !ALLOWED_FOLDER_PREFIXES.some((prefix) => folder === prefix || folder.startsWith(prefix))
    ) {
      return new Response(
        JSON.stringify({ error: '不正なアップロード先フォルダです' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accountId = import.meta.env.R2_ACCOUNT_ID;
    const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;
    const bucketName = import.meta.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error("Missing R2 configuration in environment variables");
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const ext = ALLOWED_MIME_TYPES[fileType];
    const fileName = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: fileType,
    });

    // 署名付きURLを生成 (15分有効に短縮して悪用リスクを低減)
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });
    
    const customDomain = import.meta.env.R2_PUBLIC_URL;
    const publicUrl = customDomain 
      ? `${customDomain}/${fileName}`
      : `https://REPLACE_WITH_YOUR_R2_DEV_URL/${fileName}`;

    return new Response(JSON.stringify({
      url,
      publicUrl,
      fileName
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error("Error generating presigned URL:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
};

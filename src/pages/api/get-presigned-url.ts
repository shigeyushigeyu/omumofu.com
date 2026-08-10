import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { fileType, folder = 'uploads' } = body;

    if (!fileType) {
      return new Response(JSON.stringify({ error: 'fileType is required' }), { status: 400 });
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

    // Extract extension from mime type (e.g., 'image/jpeg' -> 'jpeg')
    const ext = fileType.split('/')[1] || 'bin';
    const fileName = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: fileType,
    });

    // 署名付きURLを生成 (1時間有効)
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // アップロード後のアクセス用URL
    // R2_PUBLIC_URLが設定されていればそれを使用し、なければR2.devのデフォルトドメインを使用
    const customDomain = import.meta.env.R2_PUBLIC_URL;
    const publicUrl = customDomain 
      ? `${customDomain}/${fileName}`
      : `https://REPLACE_WITH_YOUR_R2_DEV_URL/${fileName}`; // Cloudflareのr2.devのURLはアカウントIDではなくランダム生成されるため自動推測不可

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

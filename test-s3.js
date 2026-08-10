import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://d5dabec67ab880c686e5dc959c195efe.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '6840410b33f9c1373185cd87ec34e52a',
    secretAccessKey: 'e9b34e92336a62ceacdb7242545007b64ea341218b3618438dc435d57b086bec',
  },
});

const command = new PutObjectCommand({
  Bucket: 'omumofu-assets',
  Key: 'test.png',
  ContentType: 'image/png',
});

const url = await getSignedUrl(s3, command, { 
  expiresIn: 3600,
  signableHeaders: new Set(['host', 'content-type'])
});
console.log(url);

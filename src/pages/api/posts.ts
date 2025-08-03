// src/pages/api/posts.ts
import type { APIRoute } from 'astro';
import { Client } from 'pg';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  // ★ここから try を追加
  try {
    // Content-Typeヘッダーをコンソールに出力して確認する
    console.log('Request Content-Type:', request.headers.get('content-type'));

    const formData = await request.formData();
    const threadId = formData.get('thread_id');
    const authorName = formData.get('author_name') || '名無しさん';
    const body = formData.get('body');

    if (!threadId || !body) {
      return new Response("スレッドIDと本文は必須です。", { status: 400 });
    }

    const connectionString = import.meta.env.DATABASE_URL;
    const client = new Client({ connectionString });

    try {
      await client.connect();
      const query = {
        text: 'INSERT INTO posts(thread_id, author_name, body) VALUES($1, $2, $3)',
        values: [threadId, authorName, body],
      };
      await client.query(query);
    } finally {
      await client.end();
    }

    return redirect(`/thread/${threadId}`, 303);

  // ★ここから catch を追加
  } catch (error) {
    // どんなエラーが発生したか、ターミナルに詳しく表示する
    console.error("フォームデータの処理中にエラーが発生しました:", error);
    
    // エラーが起きたことをブラウザにも返す
    return new Response("サーバー内部でエラーが発生しました。", { status: 500 });
  }
};
// src/pages/api/posts.ts
import type { APIRoute } from 'astro';
import { Client } from 'pg';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
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
    } catch (dbError) {
      // ★ DBエラーをキャッチしたら、より詳しいログを残して再スロー
      console.error('Database insert failed in /api/posts', {
        error: dbError,
        threadId,
        authorName: authorName.substring(0, 2) + '...' // 名前は一部マスク
      });
      // エラーを再スローして、外側のcatchで500エラーとして処理させる
      throw dbError; 
    } finally {
      // ★ 成功しても失敗しても、必ず接続を閉じる
      await client.end();
    }

    return redirect(`/thread/${threadId}`, 303);

  } catch (error) {
    console.error("Error in /api/posts endpoint:", error);
    return new Response("サーバー内部でエラーが発生しました。", { status: 500 });
  }
};
import type { APIRoute } from 'astro';
import { getDbClient } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ message: 'ID is required' }), { status: 400 });
  }

  const client = getDbClient();
  try {
    await client.connect();
    
    // 1. スレッド情報を取得
    const threadResult = await client.query('SELECT id, title FROM threads WHERE id = $1', [id]);
    if (threadResult.rows.length === 0) {
      return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    }
    const thread = threadResult.rows[0];

    // 2. 投稿一覧を取得
    const postsResult = await client.query('SELECT author_name, body, created_at FROM posts WHERE thread_id = $1 ORDER BY created_at ASC', [id]);
    const posts = postsResult.rows;

    // 3. スレッド情報と投稿情報を合体させたオブジェクトを作成
    const responseData = { ...thread, posts: posts };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`API Error for thread ${id}:`, error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  } finally {
    if (client) await client.end();
  }
};
//src/pages/api/threads/index.ts
import type { APIRoute } from 'astro';
import { getDbClient } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  const client = getDbClient();
  try {
    await client.connect();
    const threads = await client.query('SELECT id, title, created_at FROM threads ORDER BY created_at DESC');
    
    return new Response(JSON.stringify(threads.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API Error in /api/threads:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
    });
  } finally {
    if (client) await client.end();
  }
};
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  // 1. ブラウザのフォームからデータを受け取る
  const formData = await request.formData();
  const threadId = formData.get('thread_id');

  // 2. サーバー内部で、Python APIにデータを転送する
  try {
    const response = await fetch('https://api.omumofu.com/posts', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Python APIがエラーを返した場合
      const errorData = await response.json();
      console.error("API server returned an error:", errorData);
      // 実際にはエラーページにリダイレクトするなどの処理が良い
      return new Response(errorData.detail || "API server error", { status: 500 });
    }

  } catch (error) {
    console.error("Failed to fetch API server:", error);
    return new Response("API server connection failed", { status: 500 });
  }

  // 3. 成功したら、元のスレッド詳細ページにリダイレクトして戻す
  if (threadId) {
    return redirect(`/thread/${threadId}`, 303);
  } else {
    // もしthreadIdがなければ、とりあえず一覧に戻す
    return redirect('/messageboard');
  }
};
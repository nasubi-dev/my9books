// GET /api/og/:shelfId - OG画像生成
// TODO: @vercel/og による動的OG画像生成実装
export async function loader() {
  return new Response('OG image placeholder', {
    headers: { 'Content-Type': 'text/plain' },
  })
}

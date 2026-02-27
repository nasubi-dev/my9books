import { ImageResponse } from '@vercel/og'

const W = 1200
const H = 630

export async function loader() {
  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #dbeafe 0%, #eff6ff 50%, #e0f2fe 100%)',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          gap: 32,
        }}
      >
        {/* アイコンプレースホルダー（後でIconに差し替え） */}
        <div
          style={{
            width: 128,
            height: 128,
            background: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 16px 48px rgba(29,78,216,0.35)',
          }}
        >
          {/* 9のマーク */}
          <span
            style={{
              color: 'white',
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            9
          </span>
        </div>

        {/* サービス名 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            style={{
              color: '#0f172a',
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            my9books
          </span>
          <span
            style={{
              color: '#475569',
              fontSize: 26,
              fontWeight: 400,
            }}
          >
            あなたを作った9冊を、シェアしよう。
          </span>
        </div>
      </div>
    ),
    { width: W, height: H },
  )
}

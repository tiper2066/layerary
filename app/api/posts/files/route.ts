import { NextResponse } from 'next/server'
import { downloadFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json(
        { error: '파일 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    const { fileBuffer, contentType } = await downloadFile(fileUrl)

    // 파일 응답 생성 (Buffer를 Uint8Array로 변환)
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable, s-maxage=31536000', // 1년 캐싱
        'Content-Length': fileBuffer.length.toString(),
        'ETag': `"${Buffer.from(fileUrl).toString('base64').slice(0, 32)}"`,
      },
    })
  } catch (error: any) {
    if (error.message.includes('파일을 찾을 수 없습니다')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    console.error('File proxy error:', error)
    return NextResponse.json(
      { error: error.message || '파일을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { downloadFile } from '@/lib/b2'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    const { fileBuffer, contentType } = await downloadFile(imageUrl)

    // 이미지 응답 생성 (Buffer를 Uint8Array로 변환)
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1년 캐싱
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    if (error.message.includes('파일을 찾을 수 없습니다')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    console.error('Image proxy error:', error)
    return NextResponse.json(
      { error: error.message || '이미지를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


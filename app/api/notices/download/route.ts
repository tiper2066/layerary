import { NextResponse } from 'next/server'
import { downloadFile } from '@/lib/b2'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    const fileName = searchParams.get('fileName') || 'download'

    if (!fileUrl) {
      return NextResponse.json(
        { error: '파일 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    const { fileBuffer, contentType } = await downloadFile(fileUrl)

    // 파일 다운로드 응답 생성
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
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
    console.error('File download error:', error)
    return NextResponse.json(
      { error: error.message || '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { downloadFile } from '@/lib/b2'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')
    const fileName = searchParams.get('fileName')

    if (!fileUrl) {
      return NextResponse.json(
        { error: '파일 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    // lib/b2.ts의 downloadFile 함수 사용
    const { fileBuffer, contentType: detectedContentType } = await downloadFile(fileUrl)

    // Content-Type 결정 (detectedContentType이 있으면 사용, 없으면 파일 확장자로 판단)
    let contentType = detectedContentType || 'application/octet-stream'
    if (contentType === 'application/octet-stream' && fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase()
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        txt: 'text/plain',
      }
      if (ext && mimeTypes[ext]) {
        contentType = mimeTypes[ext]
      }
    }

    // 파일 다운로드 응답 (Buffer를 Uint8Array로 변환)
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName || 'download')}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('File download error:', error)
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


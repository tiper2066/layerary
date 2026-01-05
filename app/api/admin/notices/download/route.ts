import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import B2 from 'backblaze-b2'

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
})

let authData: any = null

async function authorize() {
  if (!authData) {
    authData = await b2.authorize()
  }
  return authData
}

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

    // B2 파일 URL에서 파일 경로 추출
    // URL 형식: https://s3.us-west-004.backblazeb2.com/bucket-name/path/to/file
    // 또는: https://f{fileId}.backblazeb2.com/file/bucket-name/path/to/file
    let filePath = ''
    if (fileUrl.includes('/file/')) {
      // B2 네이티브 URL 형식
      const match = fileUrl.match(/\/file\/[^\/]+\/(.+)$/)
      if (match) {
        filePath = match[1]
      }
    } else {
      // S3 호환 URL 형식
      const urlObj = new URL(fileUrl)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      if (pathParts.length > 1) {
        // 첫 번째는 버킷 이름, 나머지는 파일 경로
        filePath = pathParts.slice(1).join('/')
      }
    }

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로를 추출할 수 없습니다.' },
        { status: 400 }
      )
    }

    await authorize()

    const bucketName = process.env.B2_BUCKET_NAME!
    if (!bucketName) {
      return NextResponse.json(
        { error: 'B2_BUCKET_NAME이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // B2에서 파일 다운로드
    const downloadResponse = await b2.downloadFileByName({
      bucketName,
      fileName: filePath,
    })

    // 파일 데이터를 Buffer로 변환
    const fileBuffer = Buffer.from(downloadResponse.data)

    // Content-Type 결정
    let contentType = 'application/octet-stream'
    if (fileName) {
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

    // 파일 다운로드 응답
    return new NextResponse(fileBuffer, {
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


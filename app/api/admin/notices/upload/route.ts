import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, generateSafeFileName } from '@/lib/b2'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 안전한 파일명 생성
    const safeFileName = generateSafeFileName(file.name)
    const filePath = `notices/${safeFileName}`

    // Backblaze B2에 업로드
    console.log('Uploading file to B2:', { fileName: file.name, filePath, fileSize: file.size, contentType: file.type })
    const uploadResult = await uploadFile(
      buffer,
      filePath,
      file.type
    )
    console.log('B2 upload success:', uploadResult)

    return NextResponse.json({
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileName: file.name,
      filePath: filePath,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('File upload error:', error)
    const errorMessage = error.message || '파일 업로드 중 오류가 발생했습니다.'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


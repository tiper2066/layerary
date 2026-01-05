import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, generateSafeFileName } from '@/lib/b2'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const categorySlug = formData.get('categorySlug') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!categorySlug) {
      return NextResponse.json(
        { error: '카테고리 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (각 파일 10MB)
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `파일 크기는 10MB를 초과할 수 없습니다: ${file.name}` },
          { status: 400 }
        )
      }
    }

    const uploadedImages = []

    // 모든 파일 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 파일을 ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 안전한 파일명 생성
      const safeFileName = generateSafeFileName(file.name)
      const filePath = `posts/${categorySlug}/${safeFileName}`

      // Backblaze B2에 업로드
      const uploadResult = await uploadFile(buffer, filePath, file.type)

      uploadedImages.push({
        url: uploadResult.fileUrl,
        name: file.name,
        order: i,
      })
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('File upload error:', error)
    return NextResponse.json(
      { error: error.message || '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


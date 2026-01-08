import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, downloadFile } from '@/lib/b2'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { fileUrl, fileName } = body

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { error: '파일 URL과 파일명이 필요합니다.' },
        { status: 400 }
      )
    }

    // 원본 이미지 다운로드
    const { fileBuffer, contentType } = await downloadFile(fileUrl)

    // 썸네일 생성 (JPEG로 변환하여 용량 최적화)
    const thumbnail = await sharp(fileBuffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    const thumbnailFileName = `thumbnails/${fileName.replace(/\.[^/.]+$/, '.jpg')}`
    
    // 썸네일 업로드
    const thumbnailResult = await uploadFile(
      thumbnail,
      thumbnailFileName,
      'image/jpeg'
    )

    // Blur 데이터 URL 생성 (20px 크기)
    const blurImage = await sharp(fileBuffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(10)
      .jpeg({ quality: 50 })
      .toBuffer()
    
    const blurDataURL = `data:image/jpeg;base64,${blurImage.toString('base64')}`

    return NextResponse.json({
      success: true,
      thumbnailUrl: thumbnailResult.fileUrl,
      blurDataURL,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('Thumbnail generation error:', error)
    return NextResponse.json(
      { error: error.message || '썸네일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


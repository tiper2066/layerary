import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { uploadFile, downloadFile } from '@/lib/b2'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * SVG 파일용 썸네일 생성 API
 * SVG를 PNG로 변환하여 136px 높이 기준으로 썸네일 생성
 */
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

    // 원본 SVG 파일 다운로드
    const { fileBuffer, contentType } = await downloadFile(fileUrl)

    // SVG가 아닌 경우 에러
    if (!contentType.includes('svg') && !fileName.toLowerCase().endsWith('.svg')) {
      return NextResponse.json(
        { error: 'SVG 파일만 썸네일을 생성할 수 있습니다.' },
        { status: 400 }
      )
    }

    // SVG를 PNG로 변환하여 썸네일 생성 (136px 높이 기준)
    // CI/BI 카드 높이가 136px로 고정되어 있으므로
    const thumbnail = await sharp(fileBuffer, {
      density: 300, // SVG 렌더링 해상도 (DPI)
    })
      .resize(null, 136, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ quality: 90, compressionLevel: 9 }) // SVG는 벡터이므로 PNG로 변환 시 고품질 유지
      .toBuffer()

    // 썸네일 파일명 생성 (원본 파일명의 확장자를 .png로 변경)
    const baseFileName = fileName.replace(/\.[^/.]+$/, '')
    const thumbnailFileName = `thumbnails/${baseFileName}.png`
    
    // 썸네일 업로드
    const thumbnailResult = await uploadFile(
      thumbnail,
      thumbnailFileName,
      'image/png'
    )

    // Blur 데이터 URL 생성 (20px 크기)
    const blurImage = await sharp(fileBuffer, {
      density: 100, // 작은 이미지는 낮은 DPI로 충분
    })
      .resize(20, 20, { fit: 'inside' })
      .blur(10)
      .png({ quality: 50 })
      .toBuffer()
    
    const blurDataURL = `data:image/png;base64,${blurImage.toString('base64')}`

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

    console.error('SVG thumbnail generation error:', error)
    return NextResponse.json(
      { error: error.message || '썸네일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

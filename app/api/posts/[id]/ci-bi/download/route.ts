import { NextResponse } from 'next/server'
import { downloadFile } from '@/lib/b2'
import { changeSvgColors, changeCiColorSet, changeAllSvgColors, resizeSvg } from '@/lib/svg-utils'
import sharp from 'sharp'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  format: z.enum(['png', 'jpg', 'svg']),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  color: z.string().optional(),
})

/**
 * CI/BI SVG 파일 다운로드 및 변환 API
 * - SVG를 PNG/JPG로 변환
 * - 색상 변경
 * - 크기 조정
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = querySchema.parse({
      format: searchParams.get('format') || 'png',
      width: searchParams.get('width'),
      height: searchParams.get('height'),
      color: searchParams.get('color'),
    })

    const { id } = params

    // 게시물 조회
    const { prisma } = await import('@/lib/prisma')
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        images: true,
        concept: true, // CI/BI 타입
      },
    })

    if (!post) {
      return NextResponse.json(
        { error: '게시물을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 이미지 정보 추출
    let images: Array<{ url: string; thumbnailUrl?: string; name: string; order: number }> = []
    if (post.images) {
      if (Array.isArray(post.images)) {
        images = post.images as Array<{ url: string; thumbnailUrl?: string; name: string; order: number }>
      } else if (typeof post.images === 'string') {
        try {
          const parsed = JSON.parse(post.images)
          if (Array.isArray(parsed)) {
            images = parsed as Array<{ url: string; thumbnailUrl?: string; name: string; order: number }>
          }
        } catch {
          images = []
        }
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const firstImage = images[0]
    const imageUrl = firstImage.url

    // SVG 파일 다운로드
    const { fileBuffer, contentType } = await downloadFile(imageUrl)

    // SVG가 아닌 경우 에러
    if (!contentType.includes('svg') && !imageUrl.toLowerCase().endsWith('.svg')) {
      return NextResponse.json(
        { error: 'SVG 파일만 다운로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    let svgContent = fileBuffer.toString('utf-8')

    // 색상 변경
    if (validatedQuery.color) {
      // CI 컬러 세트인 경우
      if (validatedQuery.color === 'CI_COLOR_SET' && post.concept === 'CI') {
        svgContent = changeCiColorSet(svgContent, '#0060A9', '#999B9E')
      } else {
        // 일반 색상 변경 - 모든 텍스트 요소의 색상을 선택한 색상으로 변경
        svgContent = changeAllSvgColors(svgContent, validatedQuery.color)
      }
    }

    // 포맷에 따라 변환
    if (validatedQuery.format === 'svg') {
      // SVG는 벡터 방식이므로 크기 조정하지 않고 원본 그대로 반환
      // (사이즈는 다운로드 후 사용자가 조정 가능)
      
      // SVG 그대로 반환
      return new NextResponse(svgContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${post.title}.svg"`,
        },
      })
    } else {
      // SVG를 PNG 또는 JPG로 변환
      const format = validatedQuery.format === 'jpg' ? 'jpeg' : 'png'
      const mimeType = `image/${format}`

      let sharpInstance = sharp(Buffer.from(svgContent), {
        density: 300, // SVG 렌더링 해상도
      })

      // width 또는 height가 있을 때만 resize 적용 (PNG/JPG 변환 시)
      if (validatedQuery.width || validatedQuery.height) {
        const resizeOptions: { width?: number; height?: number; fit?: 'inside' } = {}
        
        // width와 height를 정수로 반올림
        const roundedWidth = validatedQuery.width ? Math.round(validatedQuery.width) : undefined
        const roundedHeight = validatedQuery.height ? Math.round(validatedQuery.height) : undefined
        
        if (roundedWidth && roundedHeight) {
          resizeOptions.width = roundedWidth
          resizeOptions.height = roundedHeight
          resizeOptions.fit = 'inside'
        } else if (roundedWidth) {
          resizeOptions.width = roundedWidth
          resizeOptions.fit = 'inside'
        } else if (roundedHeight) {
          resizeOptions.height = roundedHeight
          resizeOptions.fit = 'inside'
        }

        console.log('[Download API] Resize 옵션:', resizeOptions)

        sharpInstance = sharpInstance.resize(
          resizeOptions.width,
          resizeOptions.height,
          resizeOptions.fit ? { fit: resizeOptions.fit } : undefined
        )
      }

      // JPG인 경우 배경을 흰색으로 설정 (투명도 지원하지 않음)
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } })
      }

      const imageBuffer = await sharpInstance
        .toFormat(format, {
          quality: format === 'jpeg' ? 90 : 100,
        })
        .toBuffer()

      return new NextResponse(new Uint8Array(imageBuffer), {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${post.title}.${validatedQuery.format}"`,
        },
      })
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('CI/BI download error:', error)
    return NextResponse.json(
      { error: error.message || '다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

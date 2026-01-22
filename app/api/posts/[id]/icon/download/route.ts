import { NextResponse } from 'next/server'
import { downloadFile } from '@/lib/b2'
import { changeIconSvgProperties } from '@/lib/svg-utils'
import sharp from 'sharp'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  format: z.enum(['png', 'jpg', 'svg']),
  size: z.coerce.number().optional(),
  color: z.string().optional(),
  strokeWidth: z.coerce.number().optional(),
})

/**
 * ICON SVG 파일 다운로드 및 변환 API
 * - SVG를 PNG/JPG로 변환
 * - 색상, stroke-width, 크기 변경
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = querySchema.parse({
      format: searchParams.get('format') || 'png',
      size: searchParams.get('size'),
      color: searchParams.get('color'),
      strokeWidth: searchParams.get('strokeWidth'),
    })

    const { id } = params

    // 게시물 조회
    const { prisma } = await import('@/lib/prisma')
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        fileUrl: true,
      },
    })

    if (!post || !post.fileUrl) {
      return NextResponse.json(
        { error: '게시물을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Supabase Storage에서 SVG 파일 다운로드
    let svgContent: string
    try {
      const supabase = createServerSupabaseClient()
      const urlObj = new URL(post.fileUrl)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      
      if (pathParts.includes('icons') && pathParts.length > 0) {
        const fileName = pathParts[pathParts.length - 1]
        
        if (fileName) {
          const { data, error } = await supabase.storage
            .from('icons')
            .download(fileName)
          
          if (error) throw error
          
          svgContent = await data.text()
        } else {
          throw new Error('파일명을 찾을 수 없습니다.')
        }
      } else {
        // B2에서 다운로드 (fallback)
        const { fileBuffer } = await downloadFile(post.fileUrl)
        svgContent = fileBuffer.toString('utf-8')
      }
    } catch (error: any) {
      console.error('SVG download error:', error)
      return NextResponse.json(
        { error: 'SVG 파일을 다운로드할 수 없습니다.' },
        { status: 500 }
      )
    }

    // 속성 적용
    const color = validatedQuery.color || '#000000'
    const strokeWidth = validatedQuery.strokeWidth || 1
    const size = validatedQuery.size || 24

    svgContent = changeIconSvgProperties(svgContent, color, strokeWidth, size)

    // 포맷에 따라 변환
    if (validatedQuery.format === 'svg') {
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
        density: 600, // SVG 렌더링 해상도 (PNG와 JPG 모두 품질 개선)
      })

      // 크기 조정
      if (size) {
        const roundedSize = Math.round(size)
        sharpInstance = sharpInstance.resize(roundedSize, roundedSize)
      }

      // JPG인 경우 배경을 흰색으로 설정 (투명도 지원하지 않음)
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } })
      }

      const imageBuffer = await sharpInstance
        .toFormat(format, {
          quality: format === 'jpeg' ? 100 : 100, // JPG 품질을 최대값으로 설정
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

    console.error('ICON download error:', error)
    return NextResponse.json(
      { error: error.message || '다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

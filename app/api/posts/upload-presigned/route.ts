import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getPresignedUploadUrl, generateSafeFileName } from '@/lib/b2'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { files, categorySlug } = body // [{ name: string, type: string, size: number }]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '파일 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    if (!categorySlug) {
      return NextResponse.json(
        { error: '카테고리 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    const presignedUrls = await Promise.all(
      files.map(async (file: { name: string; type: string }) => {
        const safeFileName = generateSafeFileName(file.name)
        const filePath = `posts/${categorySlug}/${safeFileName}`
        const { uploadUrl, authorizationToken, fileName, fileUrl } = await getPresignedUploadUrl(
          filePath,
          file.type
        )

        return {
          originalName: file.name,
          fileName: fileName,
          uploadUrl: uploadUrl,
          authorizationToken: authorizationToken,
          fileUrl: fileUrl,
        }
      })
    )

    return NextResponse.json({
      success: true,
      presignedUrls,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('Presigned URL generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Presigned URL 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


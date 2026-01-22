import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { getCategoryBySlug } from '@/lib/categories'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()

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

    // 카테고리 조회
    const category = await getCategoryBySlug(categorySlug)
    if (!category) {
      return NextResponse.json(
        { error: '카테고리를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 파일 검증
    for (const file of files) {
      // 파일 크기 검증 (1MB)
      if (file.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          { error: `파일 크기는 1MB를 초과할 수 없습니다. (${file.name})` },
          { status: 400 }
        )
      }

      // 파일 타입 검증 (SVG만)
      if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
        return NextResponse.json(
          { error: `SVG 형식만 지원됩니다. (${file.name})` },
          { status: 400 }
        )
      }
    }

    const supabase = createServerSupabaseClient()
    const createdPosts = []

    // 각 SVG 파일을 업로드하고 Post 생성
    for (const file of files) {
      // 파일명에서 확장자 제거하여 제목으로 사용
      const fileName = file.name.replace(/\.svg$/i, '')
      
      // 파일을 ArrayBuffer로 변환
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 안전한 파일명 생성
      const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = safeFileName

      // Supabase Storage에 업로드
      const { data, error: uploadError } = await supabase.storage
        .from('icons')
        .upload(filePath, buffer, {
          contentType: 'image/svg+xml',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json(
          { error: `파일 업로드에 실패했습니다. (${file.name})` },
          { status: 500 }
        )
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('icons')
        .getPublicUrl(filePath)

      const fileUrl = urlData.publicUrl

      // Post 생성
      const post = await prisma.post.create({
        data: {
          title: fileName,
          categoryId: category.id,
          images: [
            {
              url: fileUrl,
              name: file.name,
              order: 0,
            },
          ],
          thumbnailUrl: fileUrl, // SVG는 썸네일이 원본과 동일
          fileUrl: fileUrl,
          fileSize: file.size,
          fileType: 'svg',
          mimeType: 'image/svg+xml',
          authorId: admin.id,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      createdPosts.push(post)
    }

    return NextResponse.json({
      success: true,
      posts: createdPosts,
      message: `${createdPosts.length}개의 아이콘이 업로드되었습니다.`,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('Icon upload error:', error)
    return NextResponse.json(
      { error: error.message || '아이콘 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

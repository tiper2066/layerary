import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  categorySlug: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const validatedQuery = querySchema.parse({
      categorySlug: searchParams.get('categorySlug'),
    })

    // 현재 게시물 조회
    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        categoryId: true,
        createdAt: true,
      },
    })

    if (!currentPost) {
      return NextResponse.json(
        { error: '게시물을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 카테고리 필터
    let categoryId = currentPost.categoryId
    if (validatedQuery.categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: validatedQuery.categorySlug },
      })

      if (category) {
        categoryId = category.id
      }
    }

    // 이전 게시물 (생성일이 더 이전)
    const prevPost = await prisma.post.findFirst({
      where: {
        categoryId,
        status: 'PUBLISHED',
        createdAt: {
          lt: currentPost.createdAt,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        images: true,
      },
    })

    // 다음 게시물 (생성일이 더 이후)
    const nextPost = await prisma.post.findFirst({
      where: {
        categoryId,
        status: 'PUBLISHED',
        createdAt: {
          gt: currentPost.createdAt,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        images: true,
      },
    })

    // 썸네일 URL 추출 (images 배열의 첫 번째 또는 thumbnailUrl)
    const getThumbnailUrl = (post: any) => {
      if (!post) return null
      if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        return post.images[0].url
      }
      return post.thumbnailUrl
    }

    return NextResponse.json({
      prevPost: prevPost
        ? {
            id: prevPost.id,
            title: prevPost.title,
            thumbnailUrl: getThumbnailUrl(prevPost),
          }
        : null,
      nextPost: nextPost
        ? {
            id: nextPost.id,
            title: nextPost.title,
            thumbnailUrl: getThumbnailUrl(nextPost),
          }
        : null,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Get post navigation error:', error)
    return NextResponse.json(
      { error: '네비게이션 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


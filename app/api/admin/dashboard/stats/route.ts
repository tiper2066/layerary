import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { CategoryType, Prisma } from '@prisma/client'

export const dynamic = 'auto'
export const revalidate = 30 // 30초 캐시 (실시간 반영 중요)

export async function GET() {
  try {
    await requireAdmin()

    // ADMIN과 ETC 타입 카테고리 제외
    const excludedTypes = [CategoryType.ADMIN, CategoryType.ETC]

    // 전체 게시물 수 (ADMIN, ETC 제외)
    const totalPosts = await prisma.post.count({
      where: {
        category: {
          type: {
            notIn: excludedTypes,
          },
        },
      },
    })

    // 전체 게시물의 이미지 총 개수 계산
    const postsWithImages = await prisma.post.findMany({
      where: {
        category: {
          type: {
            notIn: excludedTypes,
          },
        },
        images: {
          not: Prisma.JsonNull,
        },
      },
      select: {
        images: true,
      },
    })

    let totalImages = 0
    postsWithImages.forEach((post) => {
      if (post.images) {
        let images: Array<{ url: string; name: string; order: number }> = []
        
        if (Array.isArray(post.images)) {
          images = post.images as Array<{ url: string; name: string; order: number }>
        } else if (typeof post.images === 'string') {
          try {
            images = JSON.parse(post.images)
          } catch {
            images = []
          }
        } else if (typeof post.images === 'object' && post.images !== null) {
          const parsed = post.images as any
          if (Array.isArray(parsed)) {
            images = parsed
          }
        }
        
        totalImages += images.length
      }
    })

    // 카테고리 타입별 게시물 수 (더 효율적인 방법)
    const postsWithCategory = await prisma.post.findMany({
      where: {
        category: {
          type: {
            notIn: excludedTypes,
          },
        },
      },
      include: {
        category: {
          select: {
            type: true,
          },
        },
      },
    })

    const categoryTypeCounts: Record<string, number> = {
      WORK: 0,
      SOURCE: 0,
      TEMPLATE: 0,
      BROCHURE: 0,
    }

    postsWithCategory.forEach((post) => {
      const type = post.category.type
      if (type in categoryTypeCounts) {
        categoryTypeCounts[type]++
      }
    })

    return NextResponse.json({
      totalPosts,
      totalImages,
      postsByCategoryType: categoryTypeCounts,
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: '통계를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


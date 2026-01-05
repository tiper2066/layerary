import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { z } from 'zod'

const querySchema = z.object({
  categorySlug: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const imageSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  order: z.number().int().nonnegative(),
})

const createPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, '카테고리를 선택해주세요.'),
  images: z.array(imageSchema).min(1, '최소 1개의 이미지가 필요합니다.'),
  concept: z.string().optional().nullable(),
  tool: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = querySchema.parse({
      categorySlug: searchParams.get('categorySlug'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    const skip = (validatedQuery.page - 1) * validatedQuery.limit

    // 카테고리 필터
    const where: any = {
      status: 'PUBLISHED',
    }

    if (validatedQuery.categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: validatedQuery.categorySlug },
      })

      if (!category) {
        return NextResponse.json(
          { error: '카테고리를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      where.categoryId = category.id
    }

    // 게시물 목록 조회
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: validatedQuery.limit,
        orderBy: {
          createdAt: 'desc',
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
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ])

    const hasMore = skip + posts.length < total

    return NextResponse.json({
      posts,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        hasMore,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Get posts error:', error)
    return NextResponse.json(
      { error: '게시물 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()

    const validatedData = createPostSchema.parse(body)

    // 첫 번째 이미지를 thumbnailUrl과 fileUrl로 설정 (하위 호환성)
    const firstImage = validatedData.images[0]

    // 태그 처리
    const tagConnections = []
    if (validatedData.tags && validatedData.tags.length > 0) {
      for (const tagName of validatedData.tags) {
        // 태그가 존재하는지 확인하고, 없으면 생성
        let tag = await prisma.tag.findUnique({
          where: { name: tagName },
        })

        if (!tag) {
          // slug 생성 (한글 지원)
          const slug = tagName
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')

          tag = await prisma.tag.create({
            data: {
              name: tagName,
              slug: `${slug}-${Date.now()}`,
            },
          })
        }

        tagConnections.push({
          tagId: tag.id,
        })
      }
    }

    // 게시물 생성
    const post = await prisma.post.create({
      data: {
        title: validatedData.title,
        subtitle: validatedData.subtitle,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        images: validatedData.images,
        thumbnailUrl: firstImage.url,
        fileUrl: firstImage.url, // 하위 호환성
        fileSize: 0, // 이미지 크기는 나중에 계산 가능
        fileType: 'image',
        mimeType: 'image/*',
        concept: validatedData.concept,
        tool: validatedData.tool,
        authorId: admin.id,
        tags: {
          create: tagConnections,
        },
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
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Create post error:', error)
    return NextResponse.json(
      { error: '게시물을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


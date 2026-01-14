import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { z } from 'zod'
import { getCategoryBySlug } from '@/lib/categories'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  categorySlug: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  concept: z.string().optional(), // CI/BI 타입 필터
  tag: z.string().optional(), // 태그 필터
  year: z.string().optional(), // 연도 필터 (예: "2026", "~2022")
})

const imageSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  blurDataURL: z.string().optional(),
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
  config: z.record(z.any()).optional().nullable(), // CI/BI 타입 등 추가 설정
  producedAt: z.string().datetime().optional().nullable(), // ISO 8601 형식의 날짜 문자열
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // null 값을 undefined로 변환
    const categorySlug = searchParams.get('categorySlug')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    const concept = searchParams.get('concept')
    const tag = searchParams.get('tag')
    const year = searchParams.get('year')
    
    const validatedQuery = querySchema.parse({
      categorySlug: categorySlug || undefined,
      page: page || undefined,
      limit: limit || undefined,
      concept: concept || undefined,
      tag: tag || undefined,
      year: year || undefined,
    })

    const skip = (validatedQuery.page - 1) * validatedQuery.limit

    // 카테고리 필터
    const where: any = {
      status: 'PUBLISHED',
    }

    // 카테고리 정보 가져오기 (CI/BI 정렬을 위해)
    let category: any = null
    if (validatedQuery.categorySlug) {
      // 캐싱된 카테고리 조회 함수 사용
      category = await getCategoryBySlug(validatedQuery.categorySlug)

      if (!category) {
        return NextResponse.json(
          { error: '카테고리를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      where.categoryId = category.id
    }

    // concept 필터 (CI/BI 타입)
    if (validatedQuery.concept) {
      where.concept = validatedQuery.concept
    }

    // tag 필터
    if (validatedQuery.tag) {
      where.tags = {
        some: {
          tag: {
            name: validatedQuery.tag,
          },
        },
      }
    }

    // year 필터 (제작일 기준)
    if (validatedQuery.year) {
      if (validatedQuery.year.startsWith('~')) {
        // ~2022 형식: 2022년 이전 (2023-01-01 미만)
        const year = parseInt(validatedQuery.year.substring(1))
        if (!isNaN(year)) {
          where.producedAt = {
            lt: new Date(`${year + 1}-01-01`),
          }
        }
      } else {
        // 특정 연도: 해당 연도 범위
        const year = parseInt(validatedQuery.year)
        if (!isNaN(year)) {
          where.producedAt = {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          }
        }
      }
    }

    // CI/BI 또는 캐릭터 카테고리이고 필터가 'ALL'일 때만 커스텀 정렬 적용
    const isCiBiCategory = category?.pageType === 'ci-bi'
    const isCharacterCategory = category?.pageType === 'character'
    const isAllFilter = !validatedQuery.concept && !validatedQuery.tag

    let posts: any[]
    let total: number
    let hasMore: boolean

    if (isCharacterCategory && isAllFilter) {
      // 캐릭터 카테고리: 전체 게시물을 가져와서 정렬 후 페이지네이션
      const [allPosts, totalCount] = await Promise.all([
        prisma.post.findMany({
          where,
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

      // 필터 메뉴 순서 정의 (캐릭터 타입 순서)
      const filterOrder = [
        '대표이사',
        '보안사업본부',
        '인증보안사업본부',
        '미래보안사업본부',
        '기획실',
        '품질관리실',
        '보안기술연구소',
        '인사부',
        '재경부',
      ]
      
      // 각 게시물에 우선순위 부여
      const postsWithPriority = allPosts.map((post) => {
        let priority = 999 // 기본 우선순위 (낮음)
        
        // concept 필드 기반 우선순위
        if (post.concept) {
          const index = filterOrder.indexOf(post.concept)
          if (index !== -1) {
            priority = index
          }
        }
        
        return { post, priority }
      })
      
      // 우선순위로 정렬, 같은 우선순위 내에서는 최신순
      const sortedPosts = postsWithPriority
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority
          }
          return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()
        })
        .map((item) => item.post)

      // 페이지네이션 적용
      total = totalCount
      posts = sortedPosts.slice(skip, skip + validatedQuery.limit)
      hasMore = skip + posts.length < total
    } else if (isCiBiCategory && isAllFilter) {
      // 전체 게시물을 가져와서 정렬 후 페이지네이션
      const [allPosts, totalCount] = await Promise.all([
        prisma.post.findMany({
          where,
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

      // 필터 메뉴 순서 정의
      const filterOrder = ['CI', 'D.AMO', 'WAPPLES', 'iSIGN', 'Cloudbric', 'etc']
      
      // 각 게시물에 우선순위 부여
      const postsWithPriority = allPosts.map((post) => {
        let priority = 999 // 기본 우선순위 (낮음)
        
        // CI 타입 체크
        if (post.concept === 'CI') {
          priority = 0
        } else {
          // 태그 기반 우선순위
          const postTags = post.tags?.map((pt: any) => pt.tag.name) || []
          for (let i = 0; i < filterOrder.length; i++) {
            if (postTags.includes(filterOrder[i])) {
              priority = i + 1
              break // 첫 번째 매칭 태그만 사용
            }
          }
        }
        
        return { post, priority }
      })
      
      // 우선순위로 정렬, 같은 우선순위 내에서는 최신순
      const sortedPosts = postsWithPriority
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority
          }
          return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()
        })
        .map((item) => item.post)

      // 페이지네이션 적용
      total = totalCount
      posts = sortedPosts.slice(skip, skip + validatedQuery.limit)
      hasMore = skip + posts.length < total
    } else {
      // 일반 정렬 (최신순)
      const [fetchedPosts, totalCount] = await Promise.all([
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

      total = totalCount
      posts = fetchedPosts
      hasMore = skip + posts.length < total
    }

    return NextResponse.json(
      {
        posts,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, s-maxage=60',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
        },
      }
    )
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
    // 썸네일이 있으면 썸네일 URL 사용, 없으면 원본 URL 사용
    const thumbnailUrl = firstImage.thumbnailUrl || firstImage.url

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
    // CI/BI 타입 정보는 concept 필드에 저장 (config 필드가 없으므로)
    // config가 있으면 ciBiType을 concept에 저장
    const conceptValue = validatedData.config?.ciBiType 
      ? validatedData.config.ciBiType 
      : validatedData.concept

    const post = await prisma.post.create({
      data: {
        title: validatedData.title,
        subtitle: validatedData.subtitle,
        description: validatedData.description,
        categoryId: validatedData.categoryId,
        images: validatedData.images,
        thumbnailUrl: thumbnailUrl, // 썸네일 우선, 없으면 원본
        fileUrl: firstImage.url, // 하위 호환성 (원본 URL)
        fileSize: 0, // 이미지 크기는 나중에 계산 가능
        fileType: 'image',
        mimeType: 'image/*',
        concept: conceptValue,
        tool: validatedData.tool,
        producedAt: validatedData.producedAt ? new Date(validatedData.producedAt) : null,
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


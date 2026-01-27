import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTemplateSchema } from '@/lib/welcomeboard-schemas'

// GET: 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'PUBLISHED'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where = status === 'all' ? {} : { status }

    const [templates, total] = await Promise.all([
      prisma.welcomeBoardTemplate.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.welcomeBoardTemplate.count({ where }),
    ])

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + templates.length < total,
      },
    })
  } catch (error) {
    console.error('[GET /api/welcomeboard-templates] Error:', error)
    return NextResponse.json(
      { error: '템플릿 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 템플릿 생성 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 템플릿을 생성할 수 있습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createTemplateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, description, thumbnailUrl, backgroundUrl, width, height, config, status } =
      validationResult.data

    const template = await prisma.welcomeBoardTemplate.create({
      data: {
        name,
        description,
        thumbnailUrl,
        backgroundUrl,
        width,
        height,
        config,
        status,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('[POST /api/welcomeboard-templates] Error:', error)
    return NextResponse.json(
      { error: '템플릿 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

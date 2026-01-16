import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const attachmentSchema = z.object({
  url: z.string(),
  name: z.string(),
})

const createNoticeSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  content: z.string().min(1, '내용을 입력해주세요.'),
  isImportant: z.boolean().default(false),
  attachments: z.array(attachmentSchema).optional().nullable(),
})

export const dynamic = 'auto'
export const revalidate = 30 // 30초 캐시 (실시간 반영 중요)

export async function GET() {
  try {
    await requireAdmin()

    const notices = await prisma.notice.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ notices }, {
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

    console.error('Get notices error:', error)
    return NextResponse.json(
      { error: '공지사항 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    
    const validatedData = createNoticeSchema.parse(body)

    const notice = await prisma.notice.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        isImportant: validatedData.isImportant,
        attachments: validatedData.attachments ?? Prisma.JsonNull,
        authorId: admin.id,
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

    return NextResponse.json({ notice }, { status: 201 })
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

    console.error('Create notice error:', error)
    return NextResponse.json(
      { error: '공지사항을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


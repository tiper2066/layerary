import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const attachmentSchema = z.object({
  url: z.string(),
  name: z.string(),
})

const updateNoticeSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').optional(),
  content: z.string().min(1, '내용을 입력해주세요.').optional(),
  isImportant: z.boolean().optional(),
  attachments: z.array(attachmentSchema).optional().nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { id } = params
    const body = await request.json()
    
    const validatedData = updateNoticeSchema.parse(body)

    const notice = await prisma.notice.findUnique({
      where: { id },
    })

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Prisma Json 필드에 null을 설정하려면 Prisma.JsonNull 사용
    const updateData: any = { ...validatedData }
    if (updateData.attachments === null) {
      updateData.attachments = Prisma.JsonNull
    }

    const updatedNotice = await prisma.notice.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ notice: updatedNotice })
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

    console.error('Update notice error:', error)
    return NextResponse.json(
      { error: '공지사항을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const { id } = params

    const notice = await prisma.notice.findUnique({
      where: { id },
    })

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.notice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('Delete notice error:', error)
    return NextResponse.json(
      { error: '공지사항을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


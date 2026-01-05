import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const notice = await prisma.notice.findUnique({
      where: { id },
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

    if (!notice) {
      return NextResponse.json(
        { error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 조회수 증가
    await prisma.notice.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    })

    // 증가된 조회수 포함하여 반환
    const updatedNotice = await prisma.notice.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Get notice error:', error)
    return NextResponse.json(
      { error: '공지사항을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


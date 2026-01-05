import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            pageType: true,
            config: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
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

    if (!post) {
      return NextResponse.json(
        { error: '게시물을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 조회수 증가 (PUBLISHED 상태일 때만)
    if (post.status === 'PUBLISHED') {
      await prisma.post.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      })

      // 증가된 조회수 포함하여 반환
      const updatedPost = await prisma.post.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              pageType: true,
              config: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
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

      return NextResponse.json({ post: updatedPost })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json(
      { error: '게시물을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


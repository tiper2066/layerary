import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateTemplateSchema } from '@/lib/welcomeboard-schemas'
import { deleteFileByUrl } from '@/lib/b2'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: 단일 템플릿 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const template = await prisma.welcomeBoardTemplate.findUnique({
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

    if (!template) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('[GET /api/welcomeboard-templates/[id]] Error:', error)
    return NextResponse.json(
      { error: '템플릿을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 템플릿 수정 (관리자 전용)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 템플릿을 수정할 수 있습니다.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updateTemplateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // 기존 템플릿 확인
    const existingTemplate = await prisma.welcomeBoardTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 배경 이미지가 변경되었는지 확인하고 기존 이미지 삭제
    const newBackgroundUrl = validationResult.data.backgroundUrl
    if (newBackgroundUrl && existingTemplate.backgroundUrl !== newBackgroundUrl) {
      // 기존 배경 이미지가 B2 URL이면 삭제
      if (existingTemplate.backgroundUrl?.includes('backblazeb2.com')) {
        try {
          await deleteFileByUrl(existingTemplate.backgroundUrl)
          console.log('[PUT] Deleted old background image:', existingTemplate.backgroundUrl)
        } catch (deleteError) {
          console.error('[PUT] Failed to delete old background image:', deleteError)
          // 삭제 실패해도 업데이트는 계속 진행
        }
      }
    }

    const template = await prisma.welcomeBoardTemplate.update({
      where: { id },
      data: validationResult.data,
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

    return NextResponse.json(template)
  } catch (error) {
    console.error('[PUT /api/welcomeboard-templates/[id]] Error:', error)
    return NextResponse.json(
      { error: '템플릿 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 템플릿 삭제 (관리자 전용)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 템플릿을 삭제할 수 있습니다.' },
        { status: 403 }
      )
    }

    const { id } = await params

    // 기존 템플릿 확인
    const existingTemplate = await prisma.welcomeBoardTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 템플릿 삭제 전 B2에서 배경 이미지 삭제
    if (existingTemplate.backgroundUrl?.includes('backblazeb2.com')) {
      try {
        await deleteFileByUrl(existingTemplate.backgroundUrl)
        console.log('[DELETE] Deleted background image:', existingTemplate.backgroundUrl)
      } catch (deleteError) {
        console.error('[DELETE] Failed to delete background image:', deleteError)
        // 이미지 삭제 실패해도 템플릿 삭제는 계속 진행
      }
    }

    await prisma.welcomeBoardTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: '템플릿이 삭제되었습니다.' })
  } catch (error) {
    console.error('[DELETE /api/welcomeboard-templates/[id]] Error:', error)
    return NextResponse.json(
      { error: '템플릿 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

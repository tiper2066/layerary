import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFile, deleteFileByUrl } from '@/lib/b2'

// GET /api/diagrams/[id] - 단일 다이어그램 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const diagram = await prisma.diagram.findUnique({
      where: {
        id: params.id,
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

    if (!diagram) {
      return NextResponse.json(
        { error: '다이어그램을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 작성자만 조회 가능
    if (diagram.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ diagram })
  } catch (error) {
    console.error('Error fetching diagram:', error)
    return NextResponse.json(
      { error: '다이어그램을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH /api/diagrams/[id] - 다이어그램 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 기존 다이어그램 조회
    const existingDiagram = await prisma.diagram.findUnique({
      where: { id: params.id },
    })

    if (!existingDiagram) {
      return NextResponse.json(
        { error: '다이어그램을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 작성자만 수정 가능
    if (existingDiagram.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, canvasData, width, height, thumbnailDataUrl } = body

    let thumbnailUrl = existingDiagram.thumbnailUrl

    // 새 썸네일이 제공된 경우
    if (thumbnailDataUrl) {
      try {
        // 기존 썸네일 삭제
        if (existingDiagram.thumbnailUrl) {
          try {
            await deleteFileByUrl(existingDiagram.thumbnailUrl)
          } catch (deleteError) {
            console.warn('Failed to delete old thumbnail:', deleteError)
          }
        }

        // 새 썸네일 업로드
        const base64Data = thumbnailDataUrl.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        
        const timestamp = Date.now()
        const fileName = `diagrams/thumbnails/diagram_${timestamp}.png`
        
        const uploadResult = await uploadFile(buffer, fileName, 'image/png')
        thumbnailUrl = uploadResult.fileUrl
      } catch (uploadError) {
        console.error('Thumbnail upload error:', uploadError)
      }
    }

    // 다이어그램 업데이트
    const diagram = await prisma.diagram.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title : existingDiagram.title,
        description: description !== undefined ? description : existingDiagram.description,
        canvasData: canvasData !== undefined ? canvasData : existingDiagram.canvasData,
        width: width !== undefined ? width : existingDiagram.width,
        height: height !== undefined ? height : existingDiagram.height,
        thumbnailUrl,
      },
    })

    return NextResponse.json({ diagram })
  } catch (error) {
    console.error('Error updating diagram:', error)
    return NextResponse.json(
      { error: '다이어그램 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/diagrams/[id] - 다이어그램 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // 기존 다이어그램 조회
    const existingDiagram = await prisma.diagram.findUnique({
      where: { id: params.id },
    })

    if (!existingDiagram) {
      return NextResponse.json(
        { error: '다이어그램을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 작성자만 삭제 가능
    if (existingDiagram.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // B2에서 썸네일 삭제
    if (existingDiagram.thumbnailUrl) {
      try {
        await deleteFileByUrl(existingDiagram.thumbnailUrl)
      } catch (deleteError) {
        console.warn('Failed to delete thumbnail from B2:', deleteError)
      }
    }

    // DB에서 다이어그램 삭제
    await prisma.diagram.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting diagram:', error)
    return NextResponse.json(
      { error: '다이어그램 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

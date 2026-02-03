import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadEdmFile, deleteEdmFileByUrl } from '@/lib/supabase-edm-storage'
import sharp from 'sharp'
import { parseGridToCells, generateHtmlCode } from '@/lib/edm-utils'
import type { GridConfig, CellLinks, Alignment } from '@/types/edm'

// GET /api/edm/[id] - 단일 eDM 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const edm = await prisma.edm.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!edm) {
      return NextResponse.json({ error: 'eDM을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (edm.authorId !== session.user.id) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    return NextResponse.json({ edm })
  } catch (error) {
    console.error('Error fetching edm:', error)
    return NextResponse.json(
      { error: 'eDM을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH /api/edm/[id] - eDM 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.edm.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'eDM을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (existing.authorId !== session.user.id) {
      return NextResponse.json({ error: '수정 권한이 없습니다.' }, { status: 403 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const gridConfigStr = formData.get('gridConfig') as string | null
    const cellLinksStr = formData.get('cellLinks') as string | null
    const alignment = (formData.get('alignment') as Alignment) || existing.alignment

    let gridConfig = existing.gridConfig as unknown as GridConfig
    let cellLinks = (existing.cellLinks as CellLinks) || {}
    let imageWidth = existing.imageWidth
    let imageHeight = existing.imageHeight
    let cellImages = (existing.cellImages as Record<string, string>) || {}
    let thumbnailUrl = existing.thumbnailUrl

    if (gridConfigStr) {
      gridConfig = JSON.parse(gridConfigStr) as GridConfig
    }
    if (cellLinksStr) {
      cellLinks = JSON.parse(cellLinksStr) as CellLinks
    }

    if (image && image instanceof File) {
      const arrayBuffer = await image.arrayBuffer()
      const imageBuffer = Buffer.from(arrayBuffer)
      const metadata = await sharp(imageBuffer).metadata()
      imageWidth = metadata.width || existing.imageWidth
      imageHeight = metadata.height || existing.imageHeight

      const cells = parseGridToCells(gridConfig)
      const oldCellImages = (existing.cellImages as Record<string, string>) || {}

      for (const url of Object.values(oldCellImages)) {
        try {
          await deleteEdmFileByUrl(url)
        } catch (e) {
          console.warn('Failed to delete old cell image:', e)
        }
      }

      cellImages = {}
      const timestamp = Date.now()
      const basePath = `${id}_${timestamp}`

      for (const cell of cells) {
        const left = Math.round((cell.left / 100) * imageWidth)
        const top = Math.round((cell.top / 100) * imageHeight)
        const width = Math.round((cell.width / 100) * imageWidth)
        const height = Math.round((cell.height / 100) * imageHeight)

        const cropped = await sharp(imageBuffer)
          .extract({ left, top, width, height })
          .png()
          .toBuffer()

        const filePath = `${basePath}/cell_${cell.id}_${width}x${height}.png`
        const uploadResult = await uploadEdmFile(cropped, filePath, 'image/png')
        cellImages[cell.id] = uploadResult.fileUrl
      }

      if (existing.thumbnailUrl) {
        try {
          await deleteEdmFileByUrl(existing.thumbnailUrl)
        } catch (e) {
          console.warn('Failed to delete old thumbnail:', e)
        }
      }

      // 썸네일: 너비 318px로 정비율 축소 후, 상단 167px만 잘라 사용 (카드 이미지 영역에 맞춤)
      const THUMB_WIDTH = 318
      const THUMB_HEIGHT = 167
      try {
        const scaled = await sharp(imageBuffer)
          .resize(THUMB_WIDTH, null, { fit: 'inside' })
          .toBuffer()
        const scaledMeta = await sharp(scaled).metadata()
        const scaledHeight = scaledMeta.height ?? THUMB_HEIGHT
        const extractHeight = Math.min(scaledHeight, THUMB_HEIGHT)

        const thumbBuffer = await sharp(scaled)
          .extract({ left: 0, top: 0, width: THUMB_WIDTH, height: extractHeight })
          .png()
          .toBuffer()

        const thumbResult = await uploadEdmFile(
          thumbBuffer,
          `${basePath}/thumbnail.png`,
          'image/png'
        )
        thumbnailUrl = thumbResult.fileUrl
      } catch (thumbErr) {
        console.warn('Thumbnail upload failed:', thumbErr)
      }
    }

    const htmlCode = generateHtmlCode(
      gridConfig,
      cellImages,
      cellLinks,
      alignment,
      imageWidth,
      imageHeight
    )

    const edm = await prisma.edm.update({
      where: { id },
      data: {
        title: title !== undefined && title !== null ? title.trim() : existing.title,
        description:
          description !== undefined && description !== null
            ? description.trim() || null
            : existing.description,
        thumbnailUrl,
        imageWidth,
        imageHeight,
        gridConfig: gridConfig as object,
        cellLinks: cellLinks as object,
        cellImages: cellImages as object,
        htmlCode,
        alignment,
      },
    })

    return NextResponse.json({ edm })
  } catch (error: unknown) {
    console.error('Error updating edm:', error)
    const message = error instanceof Error ? error.message : 'eDM 수정에 실패했습니다.'
    return NextResponse.json(
      { error: 'eDM 수정에 실패했습니다.', detail: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    )
  }
}

// DELETE /api/edm/[id] - eDM 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.edm.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'eDM을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (existing.authorId !== session.user.id) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
    }

    const cellImages = (existing.cellImages as Record<string, string>) || {}
    for (const url of Object.values(cellImages)) {
      try {
        await deleteEdmFileByUrl(url)
      } catch (e) {
        console.warn('Failed to delete cell image:', e)
      }
    }

    if (existing.thumbnailUrl) {
      try {
        await deleteEdmFileByUrl(existing.thumbnailUrl)
      } catch (e) {
        console.warn('Failed to delete thumbnail:', e)
      }
    }

    await prisma.edm.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting edm:', error)
    return NextResponse.json(
      { error: 'eDM 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadEdmFile } from '@/lib/supabase-edm-storage'
import sharp from 'sharp'
import { parseGridToCells, generateHtmlCode } from '@/lib/edm-utils'
import type { GridConfig, CellLinks, Alignment } from '@/types/edm'

// GET /api/edm - eDM 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [edms, total] = await Promise.all([
      prisma.edm.findMany({
        where: { authorId: session.user.id },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          imageWidth: true,
          imageHeight: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.edm.count({
        where: { authorId: session.user.id },
      }),
    ])

    return NextResponse.json({
      edms,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + edms.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching edms:', error)
    return NextResponse.json(
      { error: 'eDM 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/edm - 새 eDM 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    const title = formData.get('title') as string
    const description = (formData.get('description') as string) || ''
    const gridConfig = JSON.parse((formData.get('gridConfig') as string) || '{}') as GridConfig
    const cellLinks = (JSON.parse((formData.get('cellLinks') as string) || '{}') || {}) as CellLinks
    const alignment = (formData.get('alignment') as Alignment) || 'left'

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 })
    }

    if (!image || !(image instanceof File)) {
      return NextResponse.json({ error: '이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const arrayBuffer = await image.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    const metadata = await sharp(imageBuffer).metadata()
    const imageWidth = metadata.width || 1920
    const imageHeight = metadata.height || 1080

    const cells = parseGridToCells(gridConfig)
    const cellImages: Record<string, string> = {}
    const timestamp = Date.now()
    const basePath = `${timestamp}`

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

    const htmlCode = generateHtmlCode(
      gridConfig,
      cellImages,
      cellLinks,
      alignment,
      imageWidth,
      imageHeight
    )

    // 썸네일: 너비 318px로 정비율 축소 후, 상단 167px만 잘라 사용 (카드 이미지 영역에 맞춤)
    const THUMB_WIDTH = 318
    const THUMB_HEIGHT = 167
    let thumbnailUrl: string | null = null
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

    const edm = await prisma.edm.create({
      data: {
        title: title.trim(),
        description: description.trim() || null,
        thumbnailUrl,
        imageWidth,
        imageHeight,
        gridConfig: gridConfig as object,
        cellLinks: cellLinks as object,
        cellImages: cellImages as object,
        htmlCode,
        alignment,
        authorId: session.user.id,
      },
    })

    return NextResponse.json({ edm }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating edm:', error)
    const message = error instanceof Error ? error.message : 'eDM 생성에 실패했습니다.'
    return NextResponse.json(
      { error: 'eDM 생성에 실패했습니다.', detail: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    )
  }
}

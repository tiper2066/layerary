import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const postId = formData.get('postId') as string

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!postId) {
      return NextResponse.json(
        { error: '게시물 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 타입 검증 (PNG, JPG만)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PNG 또는 JPG 형식만 지원됩니다.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `ppt-${postId}-${Date.now()}.${fileExt}`
    // 버킷 이름이 ppt-thumbnails이므로 경로에 폴더명을 포함하지 않고 파일명만 사용
    const filePath = fileName

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Supabase Storage에 업로드
    const { data, error: uploadError } = await supabase.storage
      .from('ppt-thumbnails')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('ppt-thumbnails')
      .getPublicUrl(filePath)

    const thumbnailUrl = urlData.publicUrl

    return NextResponse.json({
      success: true,
      thumbnailUrl,
      message: '썸네일 이미지가 업로드되었습니다.',
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    console.error('PPT thumbnail upload error:', error)
    return NextResponse.json(
      { error: '썸네일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

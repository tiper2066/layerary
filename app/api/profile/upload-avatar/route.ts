import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
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

    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPG, PNG 또는 GIF 형식만 지원됩니다.' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Supabase Storage에 업로드
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
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
      .from('avatars')
      .getPublicUrl(filePath)

    const avatarUrl = urlData.publicUrl

    // 기존 아바타가 있으면 삭제 (선택사항)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    })

    if (user?.avatar) {
      // 기존 아바타 파일 삭제 (Supabase Storage에서)
      const oldFileName = user.avatar.split('/').pop()
      if (oldFileName) {
        await supabase.storage
          .from('avatars')
          .remove([`avatars/${oldFileName}`])
      }
    }

    // 데이터베이스에 아바타 URL 업데이트
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: avatarUrl },
    })

    return NextResponse.json({
      success: true,
      avatarUrl,
      message: '프로필 사진이 업로드되었습니다. 다음 로그인 시 반영됩니다.',
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: '프로필 사진 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    })

    if (!user?.avatar) {
      return NextResponse.json(
        { error: '삭제할 프로필 사진이 없습니다.' },
        { status: 400 }
      )
    }

    // Supabase Storage에서 아바타 삭제
    try {
      const supabase = createServerSupabaseClient()
      const fileName = user.avatar.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('avatars')
          .remove([`avatars/${fileName}`])
      }
    } catch (error) {
      console.error('Error deleting avatar from storage:', error)
      // 스토리지 삭제 실패해도 DB 업데이트는 진행
    }

    // 데이터베이스에서 아바타 URL 제거
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatar: null },
    })

    return NextResponse.json({
      success: true,
      message: '프로필 사진이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('Remove avatar error:', error)
    return NextResponse.json(
      { error: '프로필 사진 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


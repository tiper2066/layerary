import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  password: z.string().optional(),
})

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = deleteAccountSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, avatar: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 비밀번호가 있는 경우 확인
    if (user.password) {
      if (!validatedData.password) {
        return NextResponse.json(
          { error: '비밀번호를 입력해주세요.' },
          { status: 400 }
        )
      }

      const isPasswordValid = await bcrypt.compare(
        validatedData.password,
        user.password
      )

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '비밀번호가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
    }

    // 아바타가 있으면 Supabase Storage에서 삭제
    if (user.avatar) {
      try {
        const supabase = createServerSupabaseClient()
        const fileName = user.avatar.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('avatars')
            .remove([`avatars/${fileName}`])
        }
      } catch (error) {
        console.error('Error deleting avatar:', error)
        // 아바타 삭제 실패해도 계정 삭제는 진행
      }
    }

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({
      success: true,
      message: '계정이 삭제되었습니다.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


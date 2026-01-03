import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'

const removePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
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
    const validatedData = removePasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { error: '설정된 비밀번호가 없습니다.' },
        { status: 400 }
      )
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    )

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: '비밀번호가 제거되었습니다. 이제 구글 계정으로만 로그인할 수 있습니다.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Password removal error:', error)
    return NextResponse.json(
      { error: '비밀번호 제거 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string()
    .min(5, '비밀번호는 최소 5자 이상이어야 합니다')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[.!@#])/, '영문, 숫자, 특수문자(.!@#)를 포함해야 합니다'),
})

// 이메일 도메인 검증 함수
function isValidEmailDomain(email: string): boolean {
  return email.toLowerCase().endsWith('@pentasecurity.com')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // 유효성 검사
    const validatedData = registerSchema.parse(body)

    // 이메일 도메인 검증
    if (!isValidEmailDomain(validatedData.email)) {
      return NextResponse.json(
        { error: 'pentasecurity.com 도메인의 이메일만 회원가입이 가능합니다.' },
        { status: 403 }
      )
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      )
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: 'MEMBER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(
      { message: '회원가입이 완료되었습니다.', user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Register error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


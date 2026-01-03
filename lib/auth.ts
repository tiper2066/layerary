import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import * as bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthConfig = {
  trustHost: true, // NextAuth v5 beta에서 필요
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          return null
        }

        // 비밀번호가 없는 사용자(Google OAuth)는 이메일/패스워드 로그인 불가
        if (!user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google 로그인 시 사용자를 데이터베이스에 저장
      if (account?.provider === 'google' && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true, name: true, avatar: true },
          })

          if (!existingUser) {
            // 새 사용자 생성 (기본 역할: MEMBER)
            // Google 로그인 사용자는 비밀번호가 없음
            const newUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || (profile as any)?.name || user.email.split('@')[0],
                password: null, // Google 로그인 사용자는 비밀번호 없음
                role: 'MEMBER',
                avatar: user.image || null,
              },
            })
            // user 객체에 ID와 role 추가 (jwt 콜백에서 사용)
            user.id = newUser.id
            ;(user as any).role = newUser.role
          } else {
            // 기존 사용자가 있으면 데이터베이스의 정보를 유지 (덮어쓰지 않음)
            // 사용자가 프로필을 수정한 경우 그 정보를 보존하기 위함
            // user 객체에 데이터베이스의 정보를 설정 (jwt 콜백에서 사용)
            user.id = existingUser.id
            ;(user as any).role = existingUser.role
            user.name = existingUser.name || user.name
            user.image = existingUser.avatar || user.image
          }
        } catch (error) {
          console.error('Error creating/updating Google user:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Google 로그인 시 - signIn 콜백에서 user.id와 role을 설정했으므로 사용
      if (account?.provider === 'google' && user) {
        token.id = user.id
        token.role = (user as any).role
        token.email = user.email
        token.name = user.name || null
        token.image = user.image || null
      } else if (user) {
        // Credentials 로그인 - authorize에서 반환된 정보 사용
        token.id = user.id
        token.role = (user as any).role
        token.email = user.email
        token.name = (user as any).name
        token.image = (user as any).image
      }
      // 세션 갱신 시에는 토큰에 이미 저장된 정보를 사용
      // 최신 정보가 필요하면 API 라우트에서 처리
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // 개발 환경에서 디버그 모드 활성화
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)


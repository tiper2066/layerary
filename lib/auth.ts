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
          })

          if (!existingUser) {
            // 새 사용자 생성 (기본 역할: MEMBER)
            // Google 로그인 사용자는 비밀번호가 없음
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || (profile as any)?.name || user.email.split('@')[0],
                password: null, // Google 로그인 사용자는 비밀번호 없음
                role: 'MEMBER',
                avatar: user.image || null,
              },
            })
          } else {
            // 기존 사용자 업데이트 (이름, 아바타)
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                avatar: user.image || existingUser.avatar,
              },
            })
          }
        } catch (error) {
          console.error('Error creating/updating Google user:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Google 로그인 시 데이터베이스에서 사용자 정보 가져오기
      if (account?.provider === 'google' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.email = user.email
        }
      } else if (user) {
        // Credentials 로그인
        token.id = user.id
        token.role = (user as any).role
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
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


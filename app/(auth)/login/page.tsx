'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess(true)
    }
  }, [searchParams])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // 도메인 제한 에러 메시지 처리
        if (result.error.includes('pentasecurity.com')) {
          setError('pentasecurity.com 도메인의 이메일만 로그인할 수 있습니다.')
        } else {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        }
        setIsLoading(false)
      } else {
        // 즉시 전체 페이지 리로드하여 홈으로 이동
        window.location.href = '/'
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
      // Google OAuth는 리다이렉트되므로 여기서는 에러 처리를 하지 않음
      // 에러는 NextAuth가 커스텀 에러 페이지로 리다이렉트함
    } catch (err) {
      setError('구글 로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">로그인</CardTitle>
          <CardDescription className="text-center">
            LAYERARY에 오신 것을 환영합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              회원가입이 완료되었습니다. 로그인해주세요.
            </div>
          )}

          {/* 구분선  */}
          <div className="relative">
              <Separator />
          </div>
          <div className='py-4'>
            <p className='text-center text-sm font-light text-penta-indigo leading-relaxed'>
              Layeray는 펜타시큐리티 임직원을 위한 서비스로, <br />
              펜타시큐리티 이메일 계정으로만 로그인이 가능합니다.
            </p>
          </div>

          {/* 구글 로그인 버튼 - 펜타시큐리티 이메일 계정으로만 로그인 가능 */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              // Google 로고
              // <svg className="mr-2 h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              //   <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              // </svg>
              <Image src="/img/favicon.png" alt="pentasecurity logo" width={16} height={16} className="h-4 w-4" />
            )}
            펜타시큐리티 계정 로그인
          </Button>

          {/* 구분선  */}
          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              {<span className="bg-background px-2 text-muted-foreground">
                또는
              </span>}
            </div>
          </div>  */}

          {/* 이메일/패스워드 로그인 폼 */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          {/* 회원가입 링크 */}
          {/* <div className="text-center text-sm">
            <span className="text-muted-foreground">계정이 없으신가요? </span>
            <Link href="/register" className="text-primary hover:underline">
              회원가입
            </Link>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}


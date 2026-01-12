'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  // NextAuth 에러 코드에 따른 메시지 매핑
  const getErrorMessage = () => {
    switch (error) {
      case 'AccessDenied':
        return {
          title: '로그인 제한',
          message: 'pentasecurity.com 도메인의 이메일만 로그인할 수 있습니다.',
          description: '현재 로그인하려는 계정은 허용되지 않은 도메인입니다. pentasecurity.com 도메인의 이메일로 로그인해주세요.',
        }
      case 'Configuration':
        return {
          title: '설정 오류',
          message: '인증 설정에 문제가 있습니다.',
          description: '시스템 관리자에게 문의해주세요.',
        }
      case 'Verification':
        return {
          title: '인증 오류',
          message: '인증 과정에서 오류가 발생했습니다.',
          description: '다시 시도해주세요.',
        }
      default:
        return {
          title: '로그인 오류',
          message: '로그인 중 오류가 발생했습니다.',
          description: '다시 시도해주세요.',
        }
    }
  }

  const errorInfo = getErrorMessage()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-center">
            {errorInfo.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-destructive/15 p-4 text-sm text-foreground">
            <p className="text-center">{errorInfo.description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                로그인 페이지로 돌아가기
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}

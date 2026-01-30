'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 개발 환경에서만 경고 필터링
    if (process.env.NODE_ENV === 'development') {
      const originalWarn = console.warn
      console.warn = (...args: any[]) => {
        // 정확히 이 메시지만 필터링 (매우 구체적으로)
        const message = args[0]?.toString() || ''
        if (
          message.includes('Skipping auto-scroll behavior due to `position: sticky` or `position: fixed`')
        ) {
          return // 이 경고만 무시
        }
        // 나머지 모든 경고는 정상적으로 표시
        originalWarn.apply(console, args)
      }

      // 컴포넌트 언마운트 시 원래 함수로 복원
      return () => {
        console.warn = originalWarn
      }
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={300}>
        <SessionProvider>
          <ConfirmDialogProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
          </ConfirmDialogProvider>
        </SessionProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
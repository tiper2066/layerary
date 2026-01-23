'use client'

import { useState, useEffect } from 'react'
import { Search, Menu, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface HeaderProps {
  onMenuClick?: () => void
  isCiBiPage?: boolean // CI/BI 페이지 여부
}

export function Header({ onMenuClick, isCiBiPage = false }: HeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const toggleTheme = () => {
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  const currentTheme = mounted ? (resolvedTheme || theme) : 'light'

  return (
    <header 
      className={`fixed md:absolute top-0 left-0 md:left-56 z-50 ${
        isCiBiPage ? 'md:right-[410px]' : 'right-0'
      } ${
        isCiBiPage 
          ? 'bg-neutral-50 dark:bg-neutral-900' 
          : ''
      }`}
      style={isCiBiPage ? undefined : {
        backgroundColor: currentTheme === 'dark' 
          ? 'rgba(13, 13, 13, 0.6)' // dark mode 배경 (대략적인 값)
          : 'rgba(255, 255, 255, 0.6)', // light mode 배경
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex h-16 items-center justify-between px-8 w-full">
        {/* 좌측: 메뉴 버튼 (모바일만 표시) */}
        <div className="flex items-center gap-4 -ml-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>        

        {/* 우측: 검색 바 및 사용자 메뉴 */}
        <div className="flex items-center gap-1 justify-end">
          {/* 테마 토글 버튼 */}
          {mounted && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="테마 변경"
                >
                  {currentTheme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTheme === 'dark' ? '라이트 모드로 변경' : '다크 모드로 변경'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 검색 바 */}
          <form onSubmit={handleSearch} className="hidden md:flex max-w-md w-1/4 min-w-[220px]">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="전체 리소스 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
          </form>

          {/* 모바일 검색 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => router.push('/search')}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}


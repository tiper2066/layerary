'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, ChevronRight, Home, Briefcase, Palette, FileText, BookOpen, Settings, LogIn, Gauge, Users, Megaphone, LogOut, SquareArrowOutUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeLogo } from '@/components/ThemeLogo'

interface Category {
  id: string
  name: string
  slug: string
  type: CategoryType
  parentId?: string | null
  children?: Category[]
}

interface SidebarProps {
  categories: Category[]
  className?: string
}

export function Sidebar({ categories, className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [userName, setUserName] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  // 최신 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/profile/me')
          if (response.ok) {
            const data = await response.json()
            setUserName(data.user.name)
            setUserAvatar(data.user.avatar)
          } else {
            // API 실패 시 세션 정보 사용
            setUserName(session.user.name || null)
            setUserAvatar(session.user.image || null)
          }
        } catch (error) {
          console.error('Error fetching user info:', error)
          // 에러 시 세션 정보 사용
          setUserName(session.user.name || null)
          setUserAvatar(session.user.image || null)
        }
      }
    }

    fetchUserInfo()
    
    // 주기적인 세션 업데이트 제거
    // 프로필 업데이트는 프로필 페이지에서 저장 시 router.refresh()로 처리
  }, [session?.user?.id, pathname]) // pathname 변경 시에도 업데이트 (프로필 페이지 이동 시)

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (type: CategoryType) => {
    switch (type) {
      case CategoryType.WORK:
        return Briefcase
      case CategoryType.SOURCE:
        return Palette
      case CategoryType.TEMPLATE:
        return FileText
      case CategoryType.BROCHURE:
        return BookOpen
      case CategoryType.ADMIN:
        return Settings
      default:
        return Settings
    }
  }

  const groupedCategories = categories.reduce((acc, category) => {
    // 최상위 카테고리만 그룹화 (children이 이미 포함되어 있음)
    if (!acc[category.type]) {
      acc[category.type] = []
    }
    acc[category.type].push(category)
    return acc
  }, {} as Record<CategoryType, Category[]>)

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const isActive = pathname === `/${category.slug}` || pathname.startsWith(`/${category.slug}/`)
    const IconComponent = getCategoryIcon(category.type)

    return (
      <div key={category.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground',
            level > 0 && 'ml-4'
          )}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center flex-1 gap-2 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
              {/* <IconComponent className="h-4 w-4 flex-shrink-0" /> */}
              <span className="flex-1 text-sm">{category.name}</span>
            </button>
          ) : (
            <Link
              href={`/${category.slug}`}
              className="flex items-center flex-1 gap-2"
            >
              {/* <IconComponent className="h-4 w-4 flex-shrink-0" /> */}
              <span className="flex-1 text-sm px-3">{category.name}</span>
            </Link>
          )}
        </div>
        {hasChildren && isExpanded && category.children && (
          <div className="mt-1">
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getCategoryLabel = (type: CategoryType) => {
    switch (type) {
      case CategoryType.WORK:
        return 'WORK'
      case CategoryType.SOURCE:
        return 'SOURCE'
      case CategoryType.TEMPLATE:
        return 'TEMPLATE'
      case CategoryType.BROCHURE:
        return 'BROCHURE'
      case CategoryType.ADMIN:
        return 'ADMIN'
      case CategoryType.ETC:
        return 'Etc.'
      default:
        return ''
    }
  }

  const categoryOrder = [
    CategoryType.WORK,
    CategoryType.SOURCE,
    CategoryType.TEMPLATE,
    CategoryType.BROCHURE,
    CategoryType.ETC,
    CategoryType.ADMIN,
  ]

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <aside
      className={cn(
        'w-56 bg-background flex flex-col',
        className
      )}
    >
      {/* 상단: LAYERARY 제목 */}
      <div className="p-6">
        <Link href="/" className="flex items-center">
          <ThemeLogo
            width={160}
            height={40}
            className="h-[18px] w-auto"
            priority
          />
        </Link>
      </div>

      {/* 메뉴 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-0">
          <nav className="space-y-4">
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
                pathname === '/'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Home className="h-4 w-4" />
              <span className='text-sm'>홈</span>
            </Link>

            {categoryOrder.map((type) => {
              const cats = groupedCategories[type] || []
              
              // Etc 카테고리는 하드코딩
              if (type === CategoryType.ETC) {
                return (
                  <div key={type} className="space-y-1">
                    <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {getCategoryLabel(type)}
                    </div>
                    <Link
                      href="https://img-edm-code-generator.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex-1 text-sm px-3">eDM</span> 
                      <SquareArrowOutUpRight className="h-4 w-4 flex-shrink-0 ml-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </div>
                )
              }

              // ADMIN 카테고리는 특별 메뉴
              if (type === CategoryType.ADMIN) {
                if (!session || session.user.role !== 'ADMIN') return null
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {getCategoryLabel(type)}
                    </div>
                    <Link
                      href="/admin/dashboard"
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
                        pathname.startsWith('/admin/dashboard')
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Gauge className="h-4 w-4 flex-shrink-0 ml-3" />
                      <span className="flex-1 text-sm">대시보드</span>
                    </Link>
                    <Link
                      href="/admin/users"
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
                        pathname.startsWith('/admin/users')
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Users className="h-4 w-4 flex-shrink-0 ml-3" />
                      <span className="flex-1 text-sm">회원 관리</span>
                    </Link>
                    <Link
                      href="/admin/notices"
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors',
                        pathname.startsWith('/admin/notices')
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Megaphone className="h-4 w-4 flex-shrink-0 ml-3" />
                      <span className="flex-1 text-sm">공지사항 관리</span>
                    </Link>
                  </div>
                )
              }

              // 일반 카테고리 (WORK, SOURCE, TEMPLATE, BROCHURE)
              if (cats.length === 0) return null

              // 카테고리 텍스트 랜더링 
              return (
                <div key={type} className="space-y-1">
                  <div className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {getCategoryLabel(type)}
                  </div>
                  {cats.map((category) => renderCategory(category))}
                </div>
              )
            })}
          </nav>
        </div>
      </div>

      {/* 하단: 사용자 정보 또는 로그인 버튼 */}
      <div className="p-4">
        {session ? (
          <div className="flex items-center gap-2">
            {/* 좌측: 사용자 아바타와 이름 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors flex-1 min-w-0">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={userAvatar || session.user.image || undefined} alt={userName || session.user.name || ''} />
                <AvatarFallback className="text-xs bg-white">
                  {getInitials(userName || session.user.name, session.user.email)}
                </AvatarFallback>
              </Avatar>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium truncate cursor-default">
                    {userName || session.user.name || '사용자'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{userName || session.user.name || '사용자'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          
          {/* 중간: 프로필 설정 버튼 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/profile"
                className="p-2 rounded-md hover:bg-accent transition-colors flex-shrink-0"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>프로필 설정</p>
            </TooltipContent>
          </Tooltip>
          
          {/* 우측: 로그아웃 버튼 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="p-2 rounded-md hover:bg-accent transition-colors flex-shrink-0"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>로그아웃</p>
            </TooltipContent>
          </Tooltip>
        </div>
        ) : (
          <Button
            onClick={() => router.push('/login')}
            variant="default"
            className="w-full"
          >
            <LogIn className="h-4 w-4 mr-2" />
            로그인
          </Button>
        )}
      </div>
    </aside>
  )
}


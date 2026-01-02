'use client'

import { useState } from 'react'
import Image from 'next/image';
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ChevronDown, ChevronRight, Home, Briefcase, Palette, FileText, BookOpen, Settings, User, LogIn, LayoutDashboard, Users, Megaphone, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

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
          <Image
            src="/img/site_logo.svg"
            alt="Layerary logo"
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="flex-1 text-sm px-3">eDM</span>
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
                      <LayoutDashboard className="h-4 w-4 flex-shrink-0 ml-3" />
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
                      <span className="flex-1 text-sm">사용자 관리</span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 hover:bg-accent rounded-md p-2 -m-2 transition-colors">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={undefined} alt={session.user.name || ''} />
                  <AvatarFallback className="text-xs">
                    {getInitials(session.user.name, session.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">
                    {session.user.name || '사용자'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {session.user.role === 'ADMIN' ? '관리자' : '회원'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="top">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session.user.name || '사용자'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {session.user.role === 'ADMIN' ? '관리자' : '회원'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  프로필 설정
                </Link>
              </DropdownMenuItem>
              {session.user.role === 'ADMIN' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="flex items-center">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    관리자 대시보드
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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


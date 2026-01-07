'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CategoryType } from '@prisma/client'

interface Category {
  id: string
  name: string
  slug: string
  type: CategoryType
  parentId?: string | null
  children?: Category[]
}

interface MainLayoutProps {
  children: React.ReactNode
  categories: Category[]
}

export function MainLayout({ children, categories }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  // Penta Design 상세 페이지인지 확인
  // /admin으로 시작하는 경로는 제외하고, 카테고리 slug와 id 형식인 경우만
  const isGalleryDetailPage = pathname && 
    !pathname.startsWith('/admin') && 
    /^\/[^/]+\/[^/]+$/.test(pathname) &&
    categories.some(cat => {
      const match = pathname.match(/^\/([^/]+)\//)
      return match && match[1] === cat.slug
    })

  return (
    <div className="flex min-h-screen md:h-screen bg-background">
      {/* 데스크톱 Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <Sidebar categories={categories} />
      </aside>

      {/* 모바일 Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 overflow-hidden flex flex-col">
          <Sidebar 
            categories={categories} 
            className="border-0 h-full" 
            onLinkClick={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-col flex-1 min-w-0 md:overflow-hidden">
        {!isGalleryDetailPage && <Header onMenuClick={() => setMobileMenuOpen(true)} />}
        <main className="flex-1 overflow-y-auto bg-background pt-16 md:pt-16">
          <div className="w-full px-8 pt-0 pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


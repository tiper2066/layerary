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
  pageType?: string | null
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

  // CI/BI 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isCiBiPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/ci-bi'))

  // 캐릭터 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isCharacterPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/character'))

  // WAPPLES 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isWapplesPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/wapples'))

  // D.AMO 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isDamoPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/damo'))

  // iSIGN 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isIsignPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/isign'))

  // Cloudbric 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isCloudbricPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/cloudbric'))

  // PPT 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isPptPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/ppt'))

  // 웰컴보드 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isWelcomeBoardPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/welcome-board'))

  // PDF Extractor 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isPdfExtractorPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/pdf-extractor'))

  // ICON 페이지인지 확인 (pathname 기반으로 우선 감지)
  const isIconPage = Boolean(pathname && 
    !pathname.startsWith('/admin') &&
    pathname.startsWith('/icon'))

  // CI/BI, 캐릭터, WAPPLES, D.AMO, iSIGN, Cloudbric, PPT, 웰컴보드, PDF Extractor, 또는 ICON 페이지인지 확인 (속성 패널이 있는 특수 페이지)
  const isSpecialPage = isCiBiPage || isCharacterPage || isWapplesPage || isDamoPage || isIsignPage || isCloudbricPage || isPptPage || isWelcomeBoardPage || isPdfExtractorPage || isIconPage

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
        {!isGalleryDetailPage && (
          <Header 
            onMenuClick={() => setMobileMenuOpen(true)} 
            isCiBiPage={isSpecialPage}
          />
        )}
        <main className={`flex-1 bg-background pt-16 md:pt-16 ${isSpecialPage ? 'p-0 overflow-hidden relative' : 'overflow-y-auto'}`}>
          {isSpecialPage ? (
            children
          ) : (
            <div className="w-full px-8 pt-0 pb-10">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


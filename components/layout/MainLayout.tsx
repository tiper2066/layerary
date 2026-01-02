'use client'

import { useState } from 'react'
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 데스크톱 Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <Sidebar categories={categories} />
      </aside>

      {/* 모바일 Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar categories={categories} className="border-0" />
        </SheetContent>
      </Sheet>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="container mx-auto px-8 py-10 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


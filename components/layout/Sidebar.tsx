'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Home, Briefcase, Palette, FileText, BookOpen, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryType } from '@prisma/client'

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
              <IconComponent className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{category.name}</span>
            </button>
          ) : (
            <Link
              href={`/${category.slug}`}
              className="flex items-center flex-1 gap-2"
            >
              <IconComponent className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{category.name}</span>
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

  const categoryOrder = [
    CategoryType.WORK,
    CategoryType.SOURCE,
    CategoryType.TEMPLATE,
    CategoryType.BROCHURE,
    CategoryType.ADMIN,
  ]

  return (
    <aside
      className={cn(
        'w-64 border-r bg-background overflow-y-auto',
        className
      )}
    >
      <div className="p-4">
      <nav className="space-y-2">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors mb-2',
            pathname === '/'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Home className="h-4 w-4" />
          <span>홈</span>
        </Link>

        {categoryOrder.map((type) => {
          const cats = groupedCategories[type] || []
          if (cats.length === 0) return null

          return (
            <div key={type} className="space-y-1">
              {cats.map((category) => renderCategory(category))}
            </div>
          )
        })}
      </nav>
      </div>
    </aside>
  )
}


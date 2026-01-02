'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Palette, FileText, BookOpen, LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Briefcase,
  Palette,
  FileText,
  BookOpen,
}

interface CategoryCardProps {
  title: string
  description: string
  iconName: string
  color: string
  href: string
  count: number
}

export function CategoryCard({ title, description, iconName, color, href, count }: CategoryCardProps) {
  const Icon = iconMap[iconName] || Briefcase

  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full border hover:border-primary/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className={`${color} text-white p-4 rounded-lg flex-shrink-0`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl mb-1">{title}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {count}개 메뉴
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}


'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Palette, FileText, BookOpen, LucideIcon, Wallpaper, Image } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Wallpaper,
  Image,
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
  const { data: session } = useSession()
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!session) {
      e.preventDefault()
      router.push('/login')
      return
    }
    // 세션이 있으면 Link의 기본 동작(href로 이동)을 그대로 사용
  }

  return (
    <Link href={href} onClick={handleClick}>
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full border hover:border-primary/50">
        <CardContent className="p-[36px]">
          <div className="flex flex-col items-center gap-4">
            <div className={`${color} p-4 rounded-full flex-shrink-0`}>
              <Icon className="h-8 w-8" />
            </div>
            <div className="flex-1 text-center min-w-0">
              <CardTitle className="text-lg mb-1">{title}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}


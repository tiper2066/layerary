'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SquareArrowOutUpRight, Image, Database, HardDrive, Wallpaper, FileText as FileTextIcon, BookOpen } from 'lucide-react'
import { Loader2, Images } from 'lucide-react'

interface DashboardStats {
  totalPosts: number
  totalImages: number
  postsByCategoryType: {
    WORK: number
    SOURCE: number
    TEMPLATE: number
    BROCHURE: number
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/stats')
        if (!response.ok) {
          throw new Error('통계를 불러오는데 실패했습니다.')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Supabase Usage 페이지 URL (환경 변수에서 가져오거나 기본값 사용)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseProjectId = supabaseUrl.split('//')[1]?.split('.')[0] || ''
  const supabaseUsageUrl = supabaseProjectId
    ? `https://supabase.com/dashboard/org/oyqrzeeterlhhzhazowq/usage?projectRef=${supabaseProjectId}`
    : 'https://supabase.com/dashboard'

  // Backblaze B2 대시보드 URL
  const b2DashboardUrl = 'https://tree-phx1-0000.secure.backblaze.com/b2_browse_files2.htm?bucketId=fcc961200ce077dc9eb20213'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">통계를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground mt-2">
          프로젝트 통계 및 리소스 관리
        </p>
      </div>

      {/* 카테고리별 게시물 수 (위쪽 행) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* WORK */}
        <Card className='hover:shadow-md hover:border-penta-indigo transition-all duration-200 bg-penta-indigo/5'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">WORK</CardTitle>
            <div className="bg-penta-indigo/5 dark:bg-penta-indigo/30 p-3 rounded-full">
              <Wallpaper className="h-6 w-6 text-penta-indigo" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsByCategoryType.WORK.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* SOURCE */}
        <Card className='hover:shadow-md hover:border-penta-green transition-all duration-200 bg-penta-green/5'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">SOURCE</CardTitle>
            <div className="bg-penta-green/5 dark:bg-penta-green/10 p-3 rounded-full">
              <Image className="h-6 w-6 text-penta-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsByCategoryType.SOURCE.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* TEMPLATE */}
        <Card className='hover:shadow-md hover:border-penta-yellow transition-all duration-200 bg-penta-yellow/10'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">TEMPLATE</CardTitle>
            <div className="bg-penta-yellow/10 p-3 rounded-full">
              <FileTextIcon className="h-6 w-6 text-penta-yellow" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsByCategoryType.TEMPLATE.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* BROCHURE */}
        <Card className='hover:shadow-md hover:border-penta-blue transition-all duration-200 bg-penta-blue/5'>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">BROCHURE</CardTitle>
            <div className="bg-penta-blue/5 dark:bg-penta-blue/20 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-penta-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsByCategoryType.BROCHURE.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 전체 통계 및 외부 서비스 (아래쪽 행) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 전체 게시물 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">전체 게시물</CardTitle>
            <div className="bg-muted-foreground/5 dark:bg-muted-foreground/15 p-4 rounded-full">
              <HardDrive className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalPosts.toLocaleString()}</div>
            <CardDescription className="mt-1">
              공지사항 제외
            </CardDescription>
          </CardContent>
        </Card>

        {/* 전체 이미지 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">전체 이미지</CardTitle>
            <div className="bg-muted-foreground/5 dark:bg-muted-foreground/15 p-4 rounded-full">
              <Images className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalImages.toLocaleString()}</div>
            <CardDescription className="mt-1">
              첨부된 이미지 총 개수
            </CardDescription>
          </CardContent>
        </Card>

        {/* 외부 서비스 링크 */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-medium'>외부 서비스</CardTitle>
            <CardDescription>리소스 관리 및 모니터링</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open(supabaseUsageUrl, '_blank')}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Supabase Usage</span>
                </div>
                <SquareArrowOutUpRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => window.open(b2DashboardUrl, '_blank')}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>Backblaze B2 Dashboard</span>
                </div>
                <SquareArrowOutUpRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// ChartGeneratorPage를 dynamic import로 로드 (SSR 비활성화)
const ChartGeneratorPage = dynamic(
  () => import('@/app/_category-pages/chart-generator/ChartGeneratorPage').then((mod) => ({ default: mod.ChartGeneratorPage })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function ChartGeneratorRoute() {
  return <ChartGeneratorPage />
}

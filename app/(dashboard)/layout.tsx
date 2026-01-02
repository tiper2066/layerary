import { getCategories } from '@/lib/categories'
import { MainLayout } from '@/components/layout/MainLayout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const categories = await getCategories()

  return <MainLayout categories={categories}>{children}</MainLayout>
}


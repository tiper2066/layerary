import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { EdmListPage } from '@/app/_category-pages/edm/EdmListPage'

export default async function EdmPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <EdmListPage />
}

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { EdmEditorPage } from '@/app/_category-pages/edm/EdmEditorPage'

export default async function EditEdmPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <EdmEditorPage edmId={params.id} />
}

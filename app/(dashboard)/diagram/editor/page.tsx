import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DiagramEditorPage } from '@/app/_category-pages/diagram/DiagramEditorPage'

export default async function NewDiagramPage() {
  const session = await auth()
  
  // 비로그인 사용자는 로그인 페이지로 리다이렉트
  if (!session) {
    redirect('/login')
  }

  return <DiagramEditorPage />
}

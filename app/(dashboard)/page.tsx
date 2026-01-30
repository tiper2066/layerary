import { redirect } from 'next/navigation'

export default function HomePage() {
  // 사용자를 Penta Design 페이지로 리다이렉트
  redirect('/penta-design')
}

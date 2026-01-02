'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    console.log('Login result:', result)
  }

  if (status === 'loading') return <div>Loading...</div>

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">인증 테스트</h1>
      
      {session ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-100 rounded">
            <p>✅ 로그인됨</p>
            <p>Email: {session.user.email}</p>
            <p>Name: {session.user.name}</p>
            <p>Role: {session.user.role}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              placeholder="admin@pentasecurity.com"
            />
          </div>
          <div>
            <label className="block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded"
              placeholder="admin123"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded"
          >
            로그인
          </button>
        </form>
      )}
    </div>
  )
}
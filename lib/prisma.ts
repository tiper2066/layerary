import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase 연결 풀 제한을 고려한 설정
// DATABASE_URL에 connection_limit 파라미터가 없으면 자동으로 추가
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || ''
  
  // 이미 connection_limit이나 pgbouncer 파라미터가 있으면 그대로 사용
  if (url.includes('connection_limit=') || url.includes('pgbouncer=')) {
    return url
  }
  
  // Supabase Session 모드 연결 풀 제한을 피하기 위해 connection_limit=1 추가
  // URL에 이미 쿼리 파라미터가 있으면 &로, 없으면 ?로 추가
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}connection_limit=1`
}

// Supabase 연결 풀 제한을 고려한 설정
// 개발 환경에서 핫 리로드 시 연결이 누적되는 것을 방지
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

// 개발 환경에서 핫 리로드 시 기존 연결 정리
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  
  // 개발 서버 종료 시 연결 정리
  if (typeof process !== 'undefined' && process.on) {
    process.on('beforeExit', async () => {
      await prisma.$disconnect()
    })
  }
}


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

// Vercel 서버리스 환경에서도 싱글톤 패턴 강화
// 프로덕션 환경에서도 global 객체에 저장하여 재사용
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

// 모든 환경에서 싱글톤 유지 (Vercel 서버리스 환경 대응)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

// 개발 서버 종료 시 연결 정리
if (process.env.NODE_ENV !== 'production' && typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}


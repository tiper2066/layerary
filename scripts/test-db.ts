import { prisma } from '../lib/prisma'

async function test() {
  try {
    console.log('🔍 데이터베이스 연결 테스트 시작...\n')
    
    // 사용자 조회
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })
    console.log(`✅ Users 조회 성공: ${users.length}명`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.name}, ${user.role})`)
    })
    
    // 카테고리 조회
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
      },
      orderBy: {
        order: 'asc'
      }
    })
    console.log(`\n✅ Categories 조회 성공: ${categories.length}개`)
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug}, ${cat.type})`)
    })
    
    // 관계 테스트
    const categoryWithPosts = await prisma.category.findFirst({
      include: { posts: true }
    })
    console.log(`\n✅ Category-Post 관계 테스트 성공`)
    console.log(`   - 카테고리: ${categoryWithPosts?.name || 'N/A'}`)
    console.log(`   - 게시물 수: ${categoryWithPosts?.posts.length || 0}개`)
    
    console.log('\n🎉 모든 테스트 통과!')
    
  } catch (error) {
    console.error('❌ 에러 발생:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

test()


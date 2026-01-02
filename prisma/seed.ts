import { PrismaClient, UserRole, CategoryType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 관리자 사용자 생성
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pentasecurity.com' },
    update: {},
    create: {
      email: 'admin@pentasecurity.com',
      name: '관리자',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // 테스트 회원 생성
  const memberPassword = await bcrypt.hash('member123', 10)
  const member = await prisma.user.upsert({
    where: { email: 'member@pentasecurity.com' },
    update: {},
    create: {
      email: 'member@pentasecurity.com',
      name: '테스트 회원',
      password: memberPassword,
      role: UserRole.MEMBER,
    },
  })
  console.log('✅ Member user created:', member.email)

  // 카테고리 생성
  const categories = [
    // WORK 카테고리
    {
      name: 'Penta Design',
      slug: 'penta-design',
      type: CategoryType.WORK,
      order: 1,
      description: '기 제작된 디자인 산출물',
    },
    // SOURCE 카테고리
    {
      name: 'CI/BI',
      slug: 'ci-bi',
      type: CategoryType.SOURCE,
      order: 1,
      description: 'CI/BI 벡터 이미지',
    },
    {
      name: 'ICON',
      slug: 'icon',
      type: CategoryType.SOURCE,
      order: 2,
      description: '아이콘 벡터 이미지',
    },
    {
      name: '캐릭터',
      slug: 'character',
      type: CategoryType.SOURCE,
      order: 3,
      description: '캐릭터 벡터 이미지',
    },
    {
      name: '다이어그램',
      slug: 'diagram',
      type: CategoryType.SOURCE,
      order: 4,
      description: '다이어그램 벡터 이미지',
    },
    // TEMPLATE 카테고리
    {
      name: 'PPT',
      slug: 'ppt',
      type: CategoryType.TEMPLATE,
      order: 1,
      description: 'PPT 템플릿',
    },
    {
      name: '감사/연말 카드',
      slug: 'card',
      type: CategoryType.TEMPLATE,
      order: 2,
      description: '감사/연말 카드 템플릿',
    },
    {
      name: '바탕화면',
      slug: 'wallpaper',
      type: CategoryType.TEMPLATE,
      order: 3,
      description: '바탕화면 템플릿',
    },
    {
      name: '웰컴보드',
      slug: 'welcome-board',
      type: CategoryType.TEMPLATE,
      order: 4,
      description: '웰컴보드 템플릿',
    },
    // BROCHURE 카테고리
    {
      name: 'WAPPLES',
      slug: 'wapples',
      type: CategoryType.BROCHURE,
      order: 1,
      description: 'WAPPLES 제품 브로셔',
    },
    {
      name: 'D.AMO',
      slug: 'damo',
      type: CategoryType.BROCHURE,
      order: 2,
      description: 'D.AMO 제품 브로셔',
    },
    {
      name: 'iSIGN',
      slug: 'isign',
      type: CategoryType.BROCHURE,
      order: 3,
      description: 'iSIGN 제품 브로셔',
    },
    {
      name: 'Cloudbric',
      slug: 'cloudbric',
      type: CategoryType.BROCHURE,
      order: 4,
      description: 'Cloudbric 제품 브로셔',
    },
  ]

  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
    console.log(`✅ Category created: ${created.name}`)
  }

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


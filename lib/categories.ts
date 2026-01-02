import { prisma } from './prisma'
import { CategoryType } from '@prisma/client'

export async function getCategories() {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null, // 최상위 카테고리만
    },
    include: {
      children: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: [
      { type: 'asc' },
      { order: 'asc' },
    ],
  })

  return categories
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: {
        orderBy: {
          order: 'asc',
        },
      },
      parent: true,
    },
  })

  return category
}

export async function getCategoriesByType(type: CategoryType) {
  const categories = await prisma.category.findMany({
    where: {
      type,
      parentId: null,
    },
    include: {
      children: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  })

  return categories
}


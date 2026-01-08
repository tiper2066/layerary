import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'
import { CategoryType } from '@prisma/client'

// 카테고리는 자주 변경되지 않으므로 긴 캐시 시간 사용
const CACHE_REVALIDATE_TIME = 300 // 5분

export const getCategories = unstable_cache(
  async () => {
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
  },
  ['categories'],
  {
    revalidate: CACHE_REVALIDATE_TIME,
    tags: ['categories'],
  }
)

// getCategoryBySlug는 slug 파라미터가 있으므로 cache와 unstable_cache를 조합
export const getCategoryBySlug = cache(async (slug: string) => {
  // unstable_cache를 내부에서 사용하여 slug별 캐싱
  const getCachedCategory = unstable_cache(
    async (categorySlug: string) => {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
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
    },
    ['category-by-slug'],
    {
      revalidate: CACHE_REVALIDATE_TIME,
      tags: ['categories'],
    }
  )

  return getCachedCategory(slug)
})

export const getCategoriesByType = unstable_cache(
  async (type: CategoryType) => {
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
  },
  ['categories-by-type'],
  {
    revalidate: CACHE_REVALIDATE_TIME,
    tags: ['categories'],
  }
)


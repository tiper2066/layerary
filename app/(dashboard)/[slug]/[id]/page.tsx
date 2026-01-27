import { notFound, redirect } from 'next/navigation'
import { getCategoryBySlug } from '@/lib/categories'
import { CategoryType } from '@prisma/client'
import { GalleryDetailPage } from '@/app/_category-pages/gallery/GalleryDetailPage'

// 카테고리 타입별 기본 pageType 반환
function getDefaultPageType(categoryType: CategoryType): string {
  switch (categoryType) {
    case CategoryType.WORK:
      return 'gallery'
    case CategoryType.TEMPLATE:
      return 'editor'
    default:
      return 'list'
  }
}

export const dynamic = 'force-dynamic'

export default async function PostDetailPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const category = await getCategoryBySlug(params.slug)

  if (!category) {
    notFound()
  }

  // 카테고리 타입에 따라 다른 컴포넌트 렌더링
  const pageType = category.pageType || getDefaultPageType(category.type)

  switch (pageType) {
    case 'gallery':
      return <GalleryDetailPage category={category} postId={params.id} />

    case 'ci-bi':
      // CI/BI는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'character':
      // 캐릭터는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'wapples':
      // WAPPLES는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'damo':
      // D.AMO는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'isign':
      // iSIGN은 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'cloudbric':
      // Cloudbric은 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'ppt':
      // PPT는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'welcomeboard':
      // 웰컴보드는 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'icon':
      // ICON은 리스트 페이지로 리다이렉트 (게시물 ID를 query parameter로 전달)
      redirect(`/${params.slug}?postId=${params.id}`)

    case 'editor':
      // TODO: EditorDetailPage 구현 시 추가
      return (
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground mt-4">
            편집 타입 상세 페이지는 아직 구현되지 않았습니다.
          </p>
        </div>
      )

    case 'list':
    default:
      return (
        <div className="container mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground mt-4">
            기본 상세 페이지는 아직 구현되지 않았습니다.
          </p>
        </div>
      )
  }
}


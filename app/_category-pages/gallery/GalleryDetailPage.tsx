'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImageGallery } from '@/components/category-pages/GalleryCategory/ImageGallery'
import { PostInfo } from '@/components/category-pages/GalleryCategory/PostInfo'
import { PostNavigation } from '@/components/category-pages/GalleryCategory/PostNavigation'
import { PostUploadDialog } from '@/components/category-pages/GalleryCategory/PostUploadDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

interface Category {
  id: string
  name: string
  slug: string
}

interface PostImage {
  url: string
  name: string
  order: number
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  description?: string | null
  concept?: string | null
  tool?: string | null
  images?: PostImage[] | null | any // Prisma JSON 필드는 any 타입일 수 있음
  viewCount: number
  createdAt: string
  tags?: Array<{ tag: Tag }>
  author?: {
    name: string | null
    email: string
  }
  category?: {
    slug: string
  }
}

interface NavigationPost {
  id: string
  title: string
  thumbnailUrl: string | null
}

interface GalleryDetailPageProps {
  category: Category
  postId: string
}

export function GalleryDetailPage({ category, postId }: GalleryDetailPageProps) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [prevPost, setPrevPost] = useState<NavigationPost | null>(null)
  const [nextPost, setNextPost] = useState<NavigationPost | null>(null)
  const [allPosts, setAllPosts] = useState<NavigationPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false) // 모바일 정보 패널 열림 상태

  // 게시물 상세 조회
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const [postResponse, navResponse] = await Promise.all([
          fetch(`/api/posts/${postId}`, {
            cache: 'default', // 브라우저 캐싱 활용
          }),
          fetch(`/api/posts/${postId}/navigation?categorySlug=${category.slug}`, {
            cache: 'default', // 브라우저 캐싱 활용
          }),
        ])

        if (!postResponse.ok) {
          throw new Error('게시물을 불러오는데 실패했습니다.')
        }

        const postData = await postResponse.json()
        setPost(postData.post)

        if (navResponse.ok) {
          const navData = await navResponse.json()
          setPrevPost(navData.prevPost)
          setNextPost(navData.nextPost)
          if (navData.allPosts) {
            setAllPosts(navData.allPosts)
          }
        }
      } catch (error) {
        console.error('Error fetching post:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, category.slug])

  const handleNavigate = (id: string) => {
    router.push(`/${category.slug}/${id}`)
  }

  const handleClose = () => {
    router.push(`/${category.slug}`)
  }

  const handleEdit = () => {
    setEditDialogOpen(true)
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '게시물 삭제에 실패했습니다.')
      }

      // 삭제 성공 시 목록으로 이동
      router.push(`/${category.slug}`)
    } catch (error: any) {
      console.error('Error deleting post:', error)
      alert(error.message || '게시물 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleEditSuccess = () => {
    // 게시물 정보 새로고침
    const fetchPost = async () => {
      try {
        const postResponse = await fetch(`/api/posts/${postId}`)
        if (postResponse.ok) {
          const postData = await postResponse.json()
          setPost(postData.post)
        }
      } catch (error) {
        console.error('Error fetching post:', error)
      }
    }
    fetchPost()
    setEditDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 top-0 left-0 md:left-56 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="fixed inset-0 top-0 left-0 md:left-56 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">게시물을 찾을 수 없습니다.</p>
          <Button onClick={handleClose}>목록으로 돌아가기</Button>
        </div>
      </div>
    )
  }

  // images 배열 추출 (Prisma JSON 필드 처리)
  const getImages = (): PostImage[] => {
    if (!post.images) return []
    
    if (Array.isArray(post.images)) {
      return post.images as PostImage[]
    }
    
    // JSON 필드가 객체로 반환될 수 있음
    try {
      const parsed = typeof post.images === 'string' 
        ? JSON.parse(post.images) 
        : post.images
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  
  const images = getImages()

  return (
    <div className="fixed inset-0 top-0 left-0 md:left-56 bg-background overflow-hidden flex flex-col">
      {/* 데스크톱: 닫기 버튼 */}
      <div className="hidden md:block absolute top-4 right-[35rem] z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="bg-background/80 backdrop-blur-sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 모바일: 정보 패널 토글 버튼 및 닫기 버튼 */}
      <div className="md:hidden absolute top-4 left-6 z-10 flex justify-between w-[calc(100%-50px)] gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInfoPanelOpen(true)}
          className="bg-background/80 dark:bg-gray-700 backdrop-blur-sm"
        >
          <Info className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="bg-background/80 dark:bg-gray-700 backdrop-blur-sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-full flex-col md:flex-row">
        {/* 좌측: 이미지 갤러리 */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900 md:pb-0 pb-24">
          <ImageGallery images={images} />
        </div>

        {/* 데스크톱: 우측 상세 정보 */}
        <div className="hidden md:flex w-[28rem] flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <PostInfo post={post} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>

        {/* 데스크톱: 우측 끝 네비게이션 썸네일 */}
        <div className="hidden md:block">
          <PostNavigation
            allPosts={allPosts}
            currentPostId={postId}
            onNavigate={handleNavigate}
            horizontal={false}
          />
        </div>

        {/* 모바일: 하단 네비게이션 썸네일 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
          <PostNavigation
            allPosts={allPosts}
            currentPostId={postId}
            onNavigate={handleNavigate}
            horizontal={true}
          />
        </div>
      </div>

      {/* 모바일: 하단 슬라이딩 정보 패널 */}
      <Sheet open={infoPanelOpen} onOpenChange={setInfoPanelOpen}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
          <SheetTitle className="sr-only">게시물 정보</SheetTitle>
          <PostInfo post={post} onEdit={handleEdit} onDelete={handleDelete} />
        </SheetContent>
      </Sheet>

      {/* 수정 다이얼로그 */}
      {post && (
        <PostUploadDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          categorySlug={category.slug}
          categoryId={category.id}
          postId={postId}
          post={post}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시물 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


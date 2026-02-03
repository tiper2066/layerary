import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * eDM 이미지용 Supabase Storage
 * - Supabase 대시보드에서 'edms' 버킷을 Public으로 생성해야 합니다.
 * - Storage > New bucket > 이름: edms, Public bucket 체크
 */
const BUCKET_NAME = 'edms'

export interface UploadResult {
  fileUrl: string
  filePath: string
}

/**
 * eDM 이미지를 Supabase Storage에 업로드
 * 공개 버킷이므로 반환된 URL로 직접 접근 가능 (이메일 등에서 사용 가능)
 */
export async function uploadEdmFile(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<UploadResult> {
  const supabase = createServerSupabaseClient()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    console.error('Supabase eDM upload error:', uploadError)
    throw new Error(`eDM 이미지 업로드 실패: ${uploadError.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return {
    fileUrl: urlData.publicUrl,
    filePath,
  }
}

/**
 * Supabase Storage eDM URL에서 파일 경로 추출
 * URL 형식: https://xxx.supabase.co/storage/v1/object/public/edms/{path}
 */
function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/edms\/(.+)$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

/**
 * Supabase Storage eDM URL로 파일 삭제
 */
export async function deleteEdmFileByUrl(url: string): Promise<void> {
  if (!url || !url.includes('supabase.co')) {
    return // Supabase URL이 아니면 무시
  }

  const path = extractPathFromUrl(url)
  if (!path) {
    console.warn('Could not extract path from Supabase eDM URL:', url)
    return
  }

  const supabase = createServerSupabaseClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    console.warn('Failed to delete Supabase eDM file:', error.message)
  }
}

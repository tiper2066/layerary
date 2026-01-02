import B2 from 'backblaze-b2'
import sharp from 'sharp'

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
})

let authData: any = null

async function authorize() {
  if (!authData) {
    authData = await b2.authorize()
  }
  return authData
}

export interface UploadResult {
  fileId: string
  fileName: string
  fileUrl: string
}

/**
 * 파일을 Backblaze B2에 업로드
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  await authorize()

  const bucketId = process.env.B2_BUCKET_ID!
  const bucketName = process.env.B2_BUCKET_NAME!

  // 파일 업로드 URL 가져오기
  const uploadUrl = await b2.getUploadUrl({
    bucketId,
  })

  // 파일 업로드
  const uploadResponse = await b2.uploadFile({
    uploadUrl: uploadUrl.data.uploadUrl,
    uploadAuthToken: uploadUrl.data.authorizationToken,
    fileName: fileName,
    data: file,
    mime: contentType,
  })

  // 공개 URL 생성
  const endpoint = process.env.B2_ENDPOINT || `https://f${uploadUrl.data.uploadUrl.split('f')[1].split('.')[0]}.backblazeb2.com`
  const fileUrl = `${endpoint}/${bucketName}/${fileName}`

  return {
    fileId: uploadResponse.data.fileId,
    fileName: uploadResponse.data.fileName,
    fileUrl,
  }
}

/**
 * 이미지 파일을 업로드하고 썸네일 생성
 */
export async function uploadImageWithThumbnail(
  file: Buffer,
  fileName: string,
  contentType: string,
  thumbnailSize: number = 300
): Promise<{ fileUrl: string; thumbnailUrl: string }> {
  // 원본 이미지 업로드
  const originalResult = await uploadFile(file, fileName, contentType)

  // 썸네일 생성
  const thumbnail = await sharp(file)
    .resize(thumbnailSize, thumbnailSize, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer()

  const thumbnailFileName = `thumbnails/${fileName}`
  const thumbnailResult = await uploadFile(
    thumbnail,
    thumbnailFileName,
    contentType
  )

  return {
    fileUrl: originalResult.fileUrl,
    thumbnailUrl: thumbnailResult.fileUrl,
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: string): Promise<void> {
  await authorize()

  await b2.deleteFileVersion({
    fileId,
    fileName: '', // B2 API 요구사항
  })
}

/**
 * 파일 이름에서 안전한 파일명 생성
 */
export function generateSafeFileName(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  const nameWithoutExt = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .substring(0, 50)

  return `${nameWithoutExt}_${timestamp}_${randomString}.${extension}`
}


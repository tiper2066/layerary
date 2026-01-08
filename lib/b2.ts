import B2 from 'backblaze-b2'
import sharp from 'sharp'

// 환경 변수 확인
const applicationKeyId = process.env.B2_APPLICATION_KEY_ID
const applicationKey = process.env.B2_APPLICATION_KEY

if (!applicationKeyId || !applicationKey) {
  console.error('B2 인증 정보가 설정되지 않았습니다.')
  console.error('B2_APPLICATION_KEY_ID:', applicationKeyId ? '설정됨' : '설정되지 않음')
  console.error('B2_APPLICATION_KEY:', applicationKey ? '설정됨' : '설정되지 않음')
}

const b2 = new B2({
  applicationKeyId: applicationKeyId || '',
  applicationKey: applicationKey || '',
})

let authData: any = null

async function authorize() {
  if (!applicationKeyId || !applicationKey) {
    throw new Error('B2 인증 정보가 설정되지 않았습니다. B2_APPLICATION_KEY_ID와 B2_APPLICATION_KEY를 확인해주세요.')
  }

  try {
    if (!authData) {
      authData = await b2.authorize()
    }
    return authData
  } catch (error: any) {
    console.error('B2 인증 실패:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    })
    throw new Error(`B2 인증 실패: ${error.response?.data?.message || error.message || '알 수 없는 오류'}. B2 인증 정보를 확인해주세요.`)
  }
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
  try {
    await authorize()

    const bucketId = process.env.B2_BUCKET_ID!
    const bucketName = process.env.B2_BUCKET_NAME!

    if (!bucketId || !bucketName) {
      throw new Error('B2_BUCKET_ID 또는 B2_BUCKET_NAME이 설정되지 않았습니다.')
    }

    // 파일 업로드 URL 가져오기
    const uploadUrl = await b2.getUploadUrl({
      bucketId,
    })

    if (!uploadUrl.data.uploadUrl || !uploadUrl.data.authorizationToken) {
      throw new Error('B2 업로드 URL을 가져오는데 실패했습니다.')
    }

    // 파일 업로드
    const uploadResponse = await b2.uploadFile({
      uploadUrl: uploadUrl.data.uploadUrl,
      uploadAuthToken: uploadUrl.data.authorizationToken,
      fileName: fileName,
      data: file,
      mime: contentType,
    })

    if (!uploadResponse.data.fileId) {
      throw new Error('파일 업로드에 실패했습니다.')
    }

    // 공개 URL 생성
    // B2_ENDPOINT가 설정되어 있으면 사용, 없으면 업로드 URL에서 추출
    let endpoint = process.env.B2_ENDPOINT
    if (!endpoint) {
      // 업로드 URL에서 엔드포인트 추출
      const uploadUrlStr = uploadUrl.data.uploadUrl
      const match = uploadUrlStr.match(/https:\/\/([^\/]+)/)
      if (match) {
        endpoint = `https://${match[1]}`
      } else {
        // 기본 패턴으로 추출 시도 (B2 네이티브 엔드포인트)
        const fileIdMatch = uploadUrlStr.match(/f(\d+)/)
        if (fileIdMatch) {
          endpoint = `https://f${fileIdMatch[1]}.backblazeb2.com`
        } else {
          throw new Error('B2 엔드포인트를 결정할 수 없습니다. B2_ENDPOINT를 설정해주세요.')
        }
      }
    }

    // 엔드포인트에서 마지막 슬래시 제거
    endpoint = endpoint.replace(/\/$/, '')
    
    // S3 호환 엔드포인트인지 확인 (s3.로 시작하는 경우)
    let fileUrl: string
    if (endpoint.includes('s3.') || endpoint.includes('s3-')) {
      // S3 호환 엔드포인트: https://s3.{region}.backblazeb2.com/{bucketName}/{fileName}
      fileUrl = `${endpoint}/${bucketName}/${fileName}`
    } else {
      // B2 네이티브 엔드포인트: https://f{fileId}.backblazeb2.com/file/{bucketName}/{fileName}
      fileUrl = `${endpoint}/file/${bucketName}/${fileName}`
    }

    return {
      fileId: uploadResponse.data.fileId,
      fileName: uploadResponse.data.fileName,
      fileUrl,
    }
  } catch (error: any) {
    console.error('B2 upload error:', error)
    throw new Error(`B2 파일 업로드 실패: ${error.message || '알 수 없는 오류'}`)
  }
}

/**
 * 이미지 파일을 업로드하고 썸네일 생성
 */
export async function uploadImageWithThumbnail(
  file: Buffer,
  fileName: string,
  contentType: string,
  thumbnailSize: number = 400
): Promise<{ fileUrl: string; thumbnailUrl: string; blurDataURL?: string }> {
  // 원본 이미지 업로드
  const originalResult = await uploadFile(file, fileName, contentType)

  // 썸네일 생성 (JPEG로 변환하여 용량 최적화)
  const thumbnail = await sharp(file)
    .resize(thumbnailSize, thumbnailSize, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 }) // JPEG로 변환하여 용량 최적화
    .toBuffer()

  const thumbnailFileName = `thumbnails/${fileName.replace(/\.[^/.]+$/, '.jpg')}`
  const thumbnailResult = await uploadFile(
    thumbnail,
    thumbnailFileName,
    'image/jpeg'
  )

  // Blur 데이터 URL 생성 (20px 크기)
  const blurImage = await sharp(file)
    .resize(20, 20, { fit: 'inside' })
    .blur(10)
    .jpeg({ quality: 50 })
    .toBuffer()
  
  const blurDataURL = `data:image/jpeg;base64,${blurImage.toString('base64')}`

  return {
    fileUrl: originalResult.fileUrl,
    thumbnailUrl: thumbnailResult.fileUrl,
    blurDataURL,
  }
}

/**
 * Blur 데이터 URL 생성 (기존 이미지용)
 */
export async function generateBlurDataURL(
  file: Buffer,
  size: number = 20
): Promise<string> {
  try {
    const blurImage = await sharp(file)
      .resize(size, size, { fit: 'inside' })
      .blur(10)
      .jpeg({ quality: 50 })
      .toBuffer()
    
    return `data:image/jpeg;base64,${blurImage.toString('base64')}`
  } catch (error) {
    console.error('Error generating blur data URL:', error)
    // 실패 시 투명한 1x1 픽셀 반환
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  }
}

/**
 * 파일 삭제 (fileId 사용)
 */
export async function deleteFile(fileId: string): Promise<void> {
  await authorize()

  await b2.deleteFileVersion({
    fileId,
    fileName: '', // B2 API 요구사항
  })
}

/**
 * 파일 URL로 파일 삭제
 */
export async function deleteFileByUrl(fileUrl: string): Promise<void> {
  await authorize()

  const bucketName = process.env.B2_BUCKET_NAME!
  if (!bucketName) {
    throw new Error('B2_BUCKET_NAME이 설정되지 않았습니다.')
  }

  // B2 파일 URL에서 파일 경로 추출
  let filePath = ''
  if (fileUrl.includes('/file/')) {
    // B2 네이티브 URL 형식
    const match = fileUrl.match(/\/file\/[^\/]+\/(.+)$/)
    if (match) {
      filePath = match[1]
    }
  } else {
    // S3 호환 URL 형식
    const urlObj = new URL(fileUrl)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length > 1) {
      // 첫 번째는 버킷 이름, 나머지는 파일 경로
      filePath = pathParts.slice(1).join('/')
    }
  }

  if (!filePath) {
    throw new Error('파일 경로를 추출할 수 없습니다.')
  }

  // 파일명으로 파일 버전 목록 조회하여 fileId 찾기
  const fileVersions = await b2.listFileVersions({
    bucketId: process.env.B2_BUCKET_ID!,
    startFileName: filePath,
    maxFileCount: 100, // 충분한 수의 파일 버전 조회
  })

  // 정확히 일치하는 파일 찾기 (가장 최신 버전)
  const file = fileVersions.data.files?.find((f: any) => f.fileName === filePath)
  
  if (!file) {
    console.warn(`File not found in B2: ${filePath}`)
    return // 파일이 없으면 무시하고 계속 진행
  }

  // fileId로 파일 삭제
  await b2.deleteFileVersion({
    fileId: file.fileId,
    fileName: file.fileName,
  })
}

/**
 * 파일 다운로드
 */
export async function downloadFile(fileUrl: string): Promise<{ fileBuffer: Buffer; contentType: string }> {
  await authorize()
  const bucketName = process.env.B2_BUCKET_NAME!

  if (!bucketName) {
    throw new Error('B2_BUCKET_NAME이 설정되지 않았습니다.')
  }

  // B2 파일 URL에서 파일 경로 추출
  // URL 형식: https://s3.us-west-004.backblazeb2.com/bucket-name/path/to/file
  // 또는: https://f{fileId}.backblazeb2.com/file/bucket-name/path/to/file
  let filePath = ''
  if (fileUrl.includes('/file/')) {
    // B2 네이티브 URL 형식
    const match = fileUrl.match(/\/file\/[^\/]+\/(.+)$/)
    if (match) {
      filePath = match[1]
    }
  } else {
    // S3 호환 URL 형식
    const urlObj = new URL(fileUrl)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length > 1) {
      // 첫 번째는 버킷 이름, 나머지는 파일 경로
      filePath = pathParts.slice(1).join('/')
    }
  }

  if (!filePath) {
    throw new Error('파일 경로를 추출할 수 없습니다.')
  }

  try {
    const response = await b2.downloadFileByName({
      bucketName: bucketName,
      fileName: filePath,
      responseType: 'arraybuffer',
    })

    const fileBuffer = Buffer.from(response.data)
    const contentType = response.headers['content-type'] || 'application/octet-stream'

    return { fileBuffer, contentType }
  } catch (error: any) {
    console.error('B2 download error:', error)
    if (error.response?.status === 404) {
      throw new Error('파일을 찾을 수 없습니다.')
    }
    throw new Error(`B2 파일 다운로드 실패: ${error.message || '알 수 없는 오류'}`)
  }
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


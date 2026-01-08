import B2 from 'backblaze-b2'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env 파일 로드 (각각 별도로 읽어서 둘 다 확인)
const envLocal = dotenv.config({ path: resolve(process.cwd(), '.env.local') }).parsed || {}
const envGlobal = dotenv.config({ path: resolve(process.cwd(), '.env') }).parsed || {}

// process.env에도 로드 (기존 방식 유지)
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
  applicationKey: process.env.B2_APPLICATION_KEY || '',
})

async function setupCORS() {
  try {
    console.log('B2 인증 중...')
    // 인증
    const authData = await b2.authorize()
    console.log('인증 성공!')

    const bucketId = process.env.B2_BUCKET_ID
    const bucketName = process.env.B2_BUCKET_NAME

    if (!bucketId || !bucketName) {
      throw new Error('B2_BUCKET_ID 또는 B2_BUCKET_NAME이 환경 변수에 설정되지 않았습니다.')
    }

    console.log(`버킷 정보: ${bucketName} (ID: ${bucketId})`)

    // 버킷 타입은 환경 변수에서 가져오거나 기본값 사용
    // 일반적으로 'allPublic' 또는 'allPrivate'이지만, CORS 업데이트만 하려면 생략 가능
    const bucketType = process.env.B2_BUCKET_TYPE || 'allPublic'
    console.log(`버킷 타입: ${bucketType} (환경 변수 또는 기본값)`)

    // CORS 규칙 설정 (중복 제거)
    const allowedOrigins = new Set<string>(['http://localhost:3000'])
    
    // .env.local에서 읽기 (로컬 개발용)
    const localUrl = envLocal.NEXT_PUBLIC_APP_URL
    if (localUrl) {
      try {
        const localOrigin = new URL(localUrl).origin
        if (localOrigin !== 'http://localhost:3000') {
          allowedOrigins.add(localOrigin)
          console.log(`로컬 환경 변수에서 도메인 추가: ${localOrigin}`)
        }
      } catch {
        // URL 파싱 실패 시 무시
      }
    }
    
    // .env에서 읽기 (프로덕션용)
    const globalUrl = envGlobal.NEXT_PUBLIC_APP_URL
    if (globalUrl) {
      try {
        const globalOrigin = new URL(globalUrl).origin
        if (globalOrigin !== 'http://localhost:3000') {
          allowedOrigins.add(globalOrigin)
          console.log(`전역 환경 변수에서 도메인 추가: ${globalOrigin}`)
        }
      } catch {
        // URL 파싱 실패 시 무시
      }
    }
    
    // VERCEL_URL도 확인
    if (process.env.VERCEL_URL) {
      const vercelOrigin = `https://${process.env.VERCEL_URL}`
      allowedOrigins.add(vercelOrigin)
      console.log(`Vercel URL에서 도메인 추가: ${vercelOrigin}`)
    }
    
    if (allowedOrigins.size === 1) {
      console.warn('⚠️  Vercel 도메인이 환경 변수에 설정되지 않았습니다.')
      console.warn('   .env 파일에 NEXT_PUBLIC_APP_URL을 Vercel 도메인으로 설정하세요.')
    }
    
    // Set을 배열로 변환
    const allowedOriginsArray = Array.from(allowedOrigins)

    const corsRules = [
      {
        corsRuleName: 'allow-uploads',
        allowedOrigins: allowedOriginsArray,
        allowedOperations: ['b2_upload_file'],
        allowedHeaders: [
          'Authorization',
          'X-Bz-File-Name',
          'Content-Type',
          'X-Bz-Content-Sha1',
          'X-Bz-Content-Type',
        ],
        exposeHeaders: [
          'x-bz-file-id',
          'x-bz-file-name',
          'x-bz-content-sha1',
          'x-bz-upload-timestamp',
        ],
        maxAgeSeconds: 3600,
      },
    ]

    console.log('\n설정할 CORS 규칙:')
    console.log(JSON.stringify(corsRules, null, 2))

    // 버킷 업데이트
    console.log('\n버킷 CORS 규칙 업데이트 중...')
    console.log('참고: bucketType은 유지하고 corsRules만 업데이트합니다.')
    
    // B2 API는 bucketType을 명시하지 않으면 기존 값을 유지합니다
    // 하지만 일부 버전에서는 필수일 수 있으므로 환경 변수에서 가져온 값 사용
    const updateParams: any = {
      bucketId: bucketId,
      corsRules: corsRules,
    }
    
    // bucketType이 환경 변수에 설정되어 있으면 포함
    // 하지만 updateBucket 호출 시 bucketType을 생략하면 기존 값 유지
    // 401 에러가 발생할 수 있으므로 bucketType은 생략하고 corsRules만 업데이트 시도
    try {
      await b2.updateBucket(updateParams)
      
      console.log('\n✅ CORS 규칙이 성공적으로 업데이트되었습니다!')
      console.log('\n⚠️  변경 사항이 적용되는 데 약 10분 정도 소요될 수 있습니다.')
      console.log('\n설정된 허용 출처:')
      allowedOriginsArray.forEach((origin) => {
        console.log(`  - ${origin}`)
      })
    } catch (updateError: any) {
      // updateBucket 호출 실패 시 bucketType을 포함하여 재시도
      console.log('\n⚠️  bucketType 없이 업데이트 실패, bucketType 포함하여 재시도...')
      if (process.env.B2_BUCKET_TYPE) {
        updateParams.bucketType = bucketType
        try {
          await b2.updateBucket(updateParams)
          console.log('\n✅ CORS 규칙이 성공적으로 업데이트되었습니다!')
          console.log('\n⚠️  변경 사항이 적용되는 데 약 10분 정도 소요될 수 있습니다.')
          console.log('\n설정된 허용 출처:')
          allowedOriginsArray.forEach((origin) => {
            console.log(`  - ${origin}`)
          })
        } catch (retryError: any) {
          throw retryError
        }
      } else {
        throw updateError
      }
    }
  } catch (error: any) {
    console.error('\n❌ CORS 설정 중 오류 발생:')
    if (error.response?.data) {
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('에러 메시지:', error.message)
    }
    if (error.stack) {
      console.error('스택 트레이스:', error.stack)
    }
    process.exit(1)
  }
}

setupCORS()


import B2 from 'backblaze-b2'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// .env 파일 로드
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || '',
  applicationKey: process.env.B2_APPLICATION_KEY || '',
})

async function checkCORS() {
  try {
    console.log('B2 인증 중...')
    await b2.authorize()
    console.log('인증 성공!')

    const bucketId = process.env.B2_BUCKET_ID
    const bucketName = process.env.B2_BUCKET_NAME

    if (!bucketId || !bucketName) {
      throw new Error('B2_BUCKET_ID 또는 B2_BUCKET_NAME이 환경 변수에 설정되지 않았습니다.')
    }

    console.log(`\n버킷 정보: ${bucketName} (ID: ${bucketId})`)
    console.log('\n⚠️  참고: B2 API 키에 listBuckets 권한이 없을 수 있어서')
    console.log('   버킷 정보를 직접 조회할 수 없습니다.')
    console.log('\n💡 CORS 규칙을 확인하는 방법:')
    console.log('   1. Backblaze B2 웹 콘솔에서 확인:')
    console.log('      - https://secure.backblaze.com/user_signin.htm 로그인')
    console.log('      - Buckets 메뉴 → layerary 버킷 선택')
    console.log('      - 버킷 설정에서 CORS Rules 확인')
    console.log('\n   2. 또는 B2 API 키에 listBuckets 권한을 추가하세요.')
    console.log('      - B2 콘솔 → App Keys → 해당 키 선택')
    console.log('      - "List All Bucket Names" 권한 추가')
    console.log('\n   3. 또는 이전에 설정한 CORS 규칙 확인:')
    console.log('      - 이전에 실행한 setup-b2-cors 스크립트의 출력을 확인하세요.')
    console.log('      - 또는 B2 웹 콘솔에서 직접 확인하세요.')
    
    // 간단한 테스트: updateBucket을 빈 corsRules로 호출해보면 에러 메시지에서 현재 상태를 알 수 있을 수도 있음
    // 하지만 이는 위험할 수 있으므로 하지 않음
    
    console.log('\n📝 이전에 설정한 CORS 규칙 (예상):')
    console.log('   - 허용 출처: http://localhost:3000, https://layerary-test.vercel.app')
    console.log('   - 허용 작업: b2_upload_file')
    console.log('   - 허용 헤더: Authorization, X-Bz-File-Name, Content-Type, X-Bz-Content-Sha1, X-Bz-Content-Type')
  } catch (error: any) {
    console.error('\n❌ CORS 규칙 확인 중 오류 발생:')
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

checkCORS()


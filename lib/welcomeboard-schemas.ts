import { z } from 'zod'

// 텍스트 요소 스키마
export const textElementSchema = z.object({
  id: z.string(),
  label: z.string(),
  defaultValue: z.string(),
  x: z.number().min(0).max(100), // 퍼센트 기반 위치
  y: z.number().min(0).max(100),
  width: z.number().min(10).max(100).optional(),
  fontSize: z.number().min(8).max(200).default(24),
  fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold', 'extrabold']).default('normal'),
  color: z.string().default('#333333'),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).default('middle'),
  editable: z.boolean().default(true), // 사용자 편집 가능 여부
})

// 로고 영역 스키마
export const logoAreaSchema = z.object({
  x: z.number().min(0).max(100), // 퍼센트 기반 위치
  y: z.number().min(0).max(100),
  width: z.number().min(10).max(500),
  height: z.number().min(10).max(500),
  placeholder: z.string().default('방문사 로고'),
})

// 템플릿 설정(config) JSON 스키마
export const templateConfigSchema = z.object({
  textElements: z.array(textElementSchema),
  logoArea: logoAreaSchema.optional(),
})

// 웰컴보드 템플릿 생성 스키마
export const createTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름을 입력해주세요.'),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  backgroundUrl: z.string().url('올바른 배경 이미지 URL이 필요합니다.'),
  width: z.number().min(800).max(4000).default(1920),
  height: z.number().min(600).max(3000).default(1080),
  config: templateConfigSchema,
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).default('PUBLISHED'),
})

// 웰컴보드 템플릿 수정 스키마
export const updateTemplateSchema = createTemplateSchema.partial()

// 사용자 편집 데이터 스키마 (텍스트 값과 로고)
export const userEditDataSchema = z.object({
  textValues: z.record(z.string(), z.string()), // { elementId: userValue }
  logoUrl: z.string().url().optional().nullable(),
})

// 내보내기 포맷
export type ExportFormat = 'png' | 'jpg' | 'pdf'

// 내보내기 옵션 스키마
export const exportOptionsSchema = z.object({
  format: z.enum(['png', 'jpg', 'pdf']),
  highResolution: z.boolean().default(false),
  quality: z.number().min(0.1).max(1).default(0.92), // JPG 품질
})

// 타입 추론
export type TextElement = z.infer<typeof textElementSchema>
export type LogoArea = z.infer<typeof logoAreaSchema>
export type TemplateConfig = z.infer<typeof templateConfigSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type UserEditData = z.infer<typeof userEditDataSchema>
export type ExportOptions = z.infer<typeof exportOptionsSchema>

// 웰컴보드 템플릿 타입 (DB 응답용)
export interface WelcomeBoardTemplate {
  id: string
  name: string
  description: string | null
  thumbnailUrl: string | null
  backgroundUrl: string
  width: number
  height: number
  config: TemplateConfig
  status: string
  authorId: string
  author?: {
    id: string
    name: string | null
    email: string
  }
  createdAt: Date
  updatedAt: Date
}

// 기본 템플릿 설정
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  textElements: [
    {
      id: 'welcome',
      label: '환영문',
      defaultValue: 'Welcome to',
      x: 50,
      y: 10,
      width: 80,
      fontSize: 24,
      fontWeight: 'medium',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
    {
      id: 'penta',
      label: '펜타',
      defaultValue: 'PentaSecurity',
      x: 50,
      y: 18,
      width: 80,
      fontSize: 24,
      fontWeight: 'extrabold',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
    {
      id: 'visitorInfo',
      label: '방문사 정보',
      defaultValue: '방문사 및 방문자',
      x: 50,
      y: 45,
      width: 80,
      fontSize: 54,
      fontWeight: 'medium',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
    {
      id: 'welcomeMessage',
      label: '환영 메시지',
      defaultValue: '방문을 환영합니다.',
      x: 50,
      y: 60,
      width: 80,
      fontSize: 54,
      fontWeight: 'medium',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
    {
      id: 'datetime',
      label: '일시',
      defaultValue: '2024년 6월 1일 (월)',
      x: 50,
      y: 80,
      width: 60,
      fontSize: 20,
      fontWeight: 'medium',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
    {
      id: 'location',
      label: '장소',
      defaultValue: '9F, COCO',
      x: 50,
      y: 88,
      width: 60,
      fontSize: 20,
      fontWeight: 'medium',
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    },
  ],
  logoArea: {
    x: 50,
    y: 30,
    width: 200,
    height: 80,
    placeholder: '방문사 로고',
  },
}

// 파일명 생성 유틸리티
export const generateFileName = (templateName: string, format: ExportFormat): string => {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  
  // 파일명에서 특수문자 제거
  const safeName = templateName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim().replace(/\s+/g, '_')
  
  return `WelcomeBoard_${safeName}_${dateStr}.${format}`
}

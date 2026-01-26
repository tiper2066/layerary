import { z } from 'zod'

// 차트 타입 정의
export type ChartType = 'bar' | 'line' | 'pie' | 'area'

// 공통 데이터 포인트 스키마
const dataPointSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  value: z.number().min(0, '값은 0 이상이어야 합니다.'),
})

// Bar Chart 스키마
export const barChartSchema = z.object({
  type: z.literal('bar'),
  data: z.array(dataPointSchema).min(1, '최소 1개의 데이터가 필요합니다.'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
})

// Line Chart 스키마
export const lineChartSchema = z.object({
  type: z.literal('line'),
  data: z.array(dataPointSchema).min(1, '최소 1개의 데이터가 필요합니다.'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
})

// Pie Chart 스키마
export const pieChartSchema = z.object({
  type: z.literal('pie'),
  data: z.array(dataPointSchema).min(1, '최소 1개의 데이터가 필요합니다.'),
  title: z.string().optional(),
  description: z.string().optional(),
})

// Area Chart 스키마
export const areaChartSchema = z.object({
  type: z.literal('area'),
  data: z.array(dataPointSchema).min(1, '최소 1개의 데이터가 필요합니다.'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
})

// 통합 차트 스키마 (discriminated union)
export const chartSchema = z.discriminatedUnion('type', [
  barChartSchema,
  lineChartSchema,
  pieChartSchema,
  areaChartSchema,
])

// 차트 설정 스키마 (공통)
export const chartSettingsSchema = z.object({
  width: z.number().min(300).max(2000).default(800),
  height: z.number().min(200).max(2000).default(400),
  colors: z.array(z.string()).min(1).default(['#8884d8']),
  backgroundColor: z.string().optional(),
  labelFontSize: z.number().min(8).max(24).default(12),
  valueFontSize: z.number().min(8).max(24).default(12),
  valueLabelFontSize: z.number().min(8).max(24).default(12),
  highResolution: z.boolean().default(false),
  showValueLabels: z.boolean().default(false),
  // 값 레이블 위치 및 거리 설정 (막대, 선, 영역 그래프용)
  valueLabelPosition: z.enum(['top', 'insideTop', 'inside']).default('top'),
  valueLabelOffset: z.number().min(-20).max(30).default(5),
})

// 막대 그래프 개별 설정 스키마
export const barChartSettingsSchema = z.object({
  barSize: z.number().min(10).max(100).default(40),
  barRadius: z.enum(['square', 'rounded', 'top-rounded']).default('square'),
})

// 선 그래프 개별 설정 스키마
export const lineChartSettingsSchema = z.object({
  strokeWidth: z.number().min(1).max(10).default(2),
  lineType: z.enum(['monotone', 'linear']).default('monotone'),
  dotSize: z.number().min(0).max(15).default(4),
})

// 원형 그래프 개별 설정 스키마
export const pieChartSettingsSchema = z.object({
  labelPosition: z.enum(['outside', 'inside']).default('outside'),
  labelType: z.enum(['percent', 'value']).default('value'),
  labelDistance: z.number().min(10).max(50).default(20), // 반경 비율 (%)
})

// 영역 그래프 개별 설정 스키마
export const areaChartSettingsSchema = z.object({
  strokeWidth: z.number().min(1).max(10).default(2),
  lineType: z.enum(['monotone', 'linear']).default('monotone'),
  fillType: z.enum(['solid', 'gradient']).default('solid'),
})

// 차트 타입별 영문 이름 (파일명용)
export const CHART_TYPE_NAMES: Record<ChartType, string> = {
  bar: 'BarChart',
  line: 'LineChart',
  pie: 'PieChart',
  area: 'AreaChart',
}

// 색상 프리셋 정의
export const COLOR_PRESETS = {
  pastel: {
    name: 'Pastel',
    colors: ['#A8D8EA', '#AA96DA', '#FCBAD3', '#FFFFD2', '#B5EAD7', '#C7CEEA'],
  },
  ocean: {
    name: 'Ocean',
    colors: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#84A98C'],
  },
  sunset: {
    name: 'Sunset',
    colors: ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#577590'],
  },
  modern: {
    name: 'Modern',
    colors: ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#64748B'],
  },
} as const

export type ColorPresetKey = keyof typeof COLOR_PRESETS

// 차트 데이터 타입 추론
export type BarChartData = z.infer<typeof barChartSchema>
export type LineChartData = z.infer<typeof lineChartSchema>
export type PieChartData = z.infer<typeof pieChartSchema>
export type AreaChartData = z.infer<typeof areaChartSchema>
export type ChartData = z.infer<typeof chartSchema>
export type ChartSettings = z.infer<typeof chartSettingsSchema>

// 차트 타입별 설정 타입
export type BarChartSettings = z.infer<typeof barChartSettingsSchema>
export type LineChartSettings = z.infer<typeof lineChartSettingsSchema>
export type PieChartSettings = z.infer<typeof pieChartSettingsSchema>
export type AreaChartSettings = z.infer<typeof areaChartSettingsSchema>

// 모든 차트 타입별 설정을 포함하는 타입
export interface ChartTypeSettings {
  bar: BarChartSettings
  line: LineChartSettings
  pie: PieChartSettings
  area: AreaChartSettings
}

// 기본 차트 타입별 설정값
export const DEFAULT_CHART_TYPE_SETTINGS: ChartTypeSettings = {
  bar: { barSize: 40, barRadius: 'square' },
  line: { strokeWidth: 2, lineType: 'monotone', dotSize: 4 },
  pie: { labelPosition: 'outside', labelType: 'value', labelDistance: 20 },
  area: { strokeWidth: 2, lineType: 'monotone', fillType: 'solid' },
}

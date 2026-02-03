// eDM 그리드 설정
export interface MergedCell {
  primaryId: string // "row-col" 형식
  rowSpan: number
  colSpan: number
}

export interface GridConfig {
  rows: number[] // 0~100 퍼센트
  cols: number[]
  mergedCells: MergedCell[]
}

// 셀 정보 (rowspan/colspan 계산 후)
export interface CellInfo {
  id: string // "row-col"
  row: number
  col: number
  rowSpan: number
  colSpan: number
  left: number // 퍼센트
  top: number
  width: number
  height: number
}

export type CellLinks = Record<string, string> // { "row-col": "https://..." }
export type CellImages = Record<string, string> // { "row-col": "Supabase Storage URL" }
export type Alignment = 'left' | 'center' | 'right'

import type { GridConfig, CellInfo, CellLinks, CellImages, Alignment } from '@/types/edm'

/**
 * 파일명 검증: 영문, 숫자, 언더스코어(_), 하이픈(-)만 허용
 */
export function validateEdmFileName(name: string): boolean {
  const baseName = name.replace(/\.[^/.]+$/, '')
  return /^[a-zA-Z0-9_-]+$/.test(baseName)
}

/**
 * 그리드 설정을 파싱하여 셀 목록 생성 (병합 고려)
 */
export function parseGridToCells(config: GridConfig): CellInfo[] {
  const { rows, cols, mergedCells } = config
  const cells: CellInfo[] = []
  const mergedSet = new Set<string>()

  mergedCells.forEach((m) => {
    for (let r = 0; r < m.rowSpan; r++) {
      for (let c = 0; c < m.colSpan; c++) {
        if (r > 0 || c > 0) {
          const [pr, pc] = m.primaryId.split('-').map(Number)
          mergedSet.add(`${pr + r}-${pc + c}`)
        }
      }
    }
  })

  for (let row = 0; row < rows.length - 1; row++) {
    for (let col = 0; col < cols.length - 1; col++) {
      const id = `${row + 1}-${col + 1}`
      if (mergedSet.has(id)) continue

      const merged = mergedCells.find((m) => m.primaryId === id)
      const rowSpan = merged?.rowSpan ?? 1
      const colSpan = merged?.colSpan ?? 1

      const left = cols[col]
      const top = rows[row]
      const width = cols[col + colSpan] - cols[col]
      const height = rows[row + rowSpan] - rows[row]

      cells.push({
        id,
        row: row + 1,
        col: col + 1,
        rowSpan,
        colSpan,
        left,
        top,
        width,
        height,
      })
    }
  }

  return cells
}

/**
 * 이미지 URL을 복사용 짧은 경로로 변환 (data URL → placeholder)
 */
function getImageUrlForOutput(url: string, cellId: string, usePlaceholders: boolean): string {
  if (!url) return ''
  if (usePlaceholders && url.startsWith('data:')) {
    return `cell_${cellId}.png`
  }
  return url
}

/**
 * 이메일 호환 HTML 코드 생성
 * - 최상위 태그: table
 * - 정렬: table의 margin-left/margin 스타일로 적용
 * - usePlaceholdersForDataUrls: true 시 data URL을 cell_1-1.png 형식으로 대체 (복사용)
 */
export function generateHtmlCode(
  config: GridConfig,
  cellImages: CellImages,
  cellLinks: CellLinks,
  alignment: Alignment,
  imageWidth: number,
  imageHeight: number,
  usePlaceholdersForDataUrls: boolean = false
): string {
  const cells = parseGridToCells(config)

  // 정렬: table 태그에 직접 적용
  const alignStyle =
    alignment === 'center'
      ? 'margin: 0 auto'
      : alignment === 'right'
        ? 'margin-left: auto'
        : ''

  const tableStyle = [
    'width: 100%',
    `max-width: ${imageWidth}px`,
    'min-width: 320px',
    'border-collapse: collapse',
    'border-spacing: 0',
    'padding: 0',
    'table-layout: fixed',
    alignStyle,
  ]
    .filter(Boolean)
    .join('; ')

  const colWidths: number[] = []
  for (let c = 0; c < config.cols.length - 1; c++) {
    colWidths.push(config.cols[c + 1] - config.cols[c])
  }

  const gridMap: Map<string, string> = new Map()
  cells.forEach((cell) => {
    for (let rr = 0; rr < cell.rowSpan; rr++) {
      for (let cc = 0; cc < cell.colSpan; cc++) {
        gridMap.set(`${cell.row + rr}-${cell.col + cc}`, cell.id)
      }
    }
  })

  let html = `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="${tableStyle}">\n`
  html += '  <colgroup>\n'
  colWidths.forEach((w) => {
    html += `    <col style="width: ${w}%;" />\n`
  })
  html += '  </colgroup>\n'

  const rendered = new Set<string>()

  for (let r = 0; r < config.rows.length - 1; r++) {
    html += '  <tr>\n'
    for (let c = 0; c < config.cols.length - 1; c++) {
      const posKey = `${r + 1}-${c + 1}`
      if (rendered.has(posKey)) continue

      const cellId = gridMap.get(posKey)
      if (!cellId) continue

      const cell = cells.find((ce) => ce.id === cellId)
      if (!cell || cell.row !== r + 1 || cell.col !== c + 1) continue

      const rawUrl = cellImages[cellId] || ''
      const imgUrl = getImageUrlForOutput(rawUrl, cellId, usePlaceholdersForDataUrls)
      const link = cellLinks[cellId] || ''
      const rowSpan = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''
      const colSpan = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''

      for (let rr = 0; rr < cell.rowSpan; rr++) {
        for (let cc = 0; cc < cell.colSpan; cc++) {
          rendered.add(`${cell.row + rr}-${cell.col + cc}`)
        }
      }

      const tdStyle = ['padding: 0', 'vertical-align: top', 'border: none'].join('; ')
      const imgStyle = ['display: block', 'width: 100%', 'max-width: 100%', 'height: auto', 'border: none'].join('; ')

      let content = ''
      if (imgUrl) {
        const imgTag = `<img src="${imgUrl}" alt="Cell ${cellId}" style="${imgStyle}" />`
        content = link ? `<a href="${link}" target="_blank" style="display:block;">${imgTag}</a>` : imgTag
      }

      html += `    <td${rowSpan}${colSpan} style="${tdStyle}">${content}</td>\n`
    }
    html += '  </tr>\n'
  }

  html += '</table>'

  if (usePlaceholdersForDataUrls) {
    return `<!-- 이미지 경로: 저장 시 Supabase Storage URL로 자동 교체됩니다. 미리보기용 placeholder: cell_행-열.png -->\n${html}`
  }
  return html
}

/**
 * 기본 3x3 그리드 설정
 */
export function getDefaultGridConfig(): GridConfig {
  return {
    rows: [0, 33.33, 66.66, 100],
    cols: [0, 33.33, 66.66, 100],
    mergedCells: [],
  }
}

/**
 * 선택된 셀들이 수평/수직으로 연결된 직사각형인지 검사
 * (대각선만 선택된 경우 등은 불가)
 */
export function canMergeCells(
  config: GridConfig,
  selectedCellIds: string[]
): { valid: boolean; primaryId?: string; rowSpan?: number; colSpan?: number } {
  if (selectedCellIds.length < 2) {
    return { valid: false }
  }

  const cells = parseGridToCells(config)
  const selectedCells = cells.filter((c) => selectedCellIds.includes(c.id))
  if (selectedCells.length !== selectedCellIds.length) {
    return { valid: false }
  }

  const positions = new Set<string>()
  let minR = Infinity,
    maxR = -Infinity,
    minC = Infinity,
    maxC = -Infinity

  for (const cell of selectedCells) {
    for (let r = 0; r < cell.rowSpan; r++) {
      for (let c = 0; c < cell.colSpan; c++) {
        const row = cell.row + r
        const col = cell.col + c
        const key = `${row}-${col}`
        if (positions.has(key)) return { valid: false }
        positions.add(key)
        minR = Math.min(minR, row)
        maxR = Math.max(maxR, row)
        minC = Math.min(minC, col)
        maxC = Math.max(maxC, col)
      }
    }
  }

  const expectedCount = (maxR - minR + 1) * (maxC - minC + 1)
  if (positions.size !== expectedCount) return { valid: false }

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!positions.has(`${r}-${c}`)) return { valid: false }
    }
  }

  return {
    valid: true,
    primaryId: `${minR}-${minC}`,
    rowSpan: maxR - minR + 1,
    colSpan: maxC - minC + 1,
  }
}

/**
 * 셀 병합 수행: mergedCells 업데이트, 기존 병합 제거 후 새 병합 추가
 */
export function mergeCells(
  config: GridConfig,
  primaryId: string,
  rowSpan: number,
  colSpan: number
): GridConfig {
  const [pr, pc] = primaryId.split('-').map(Number)
  const newMergedCells: typeof config.mergedCells = []

  for (const m of config.mergedCells) {
    const [mr, mc] = m.primaryId.split('-').map(Number)
    const mEndR = mr + m.rowSpan - 1
    const mEndC = mc + m.colSpan - 1
    if (mr >= pr + rowSpan || mEndR < pr || mc >= pc + colSpan || mEndC < pc) {
      newMergedCells.push(m)
    }
  }

  newMergedCells.push({ primaryId, rowSpan, colSpan })
  return { ...config, mergedCells: newMergedCells }
}

/** 병합된 영역 내부를 제외한 가로 라인 세그먼트 [left%, right%][] */
export function getHorizontalLineSegments(config: GridConfig): [number, number][][] {
  const { mergedCells, rows, cols } = config
  const result: [number, number][][] = []
  for (let i = 0; i < rows.length - 2; i++) {
    const r1 = i + 1
    const r2 = i + 2
    const gaps: [number, number][] = []
    for (const m of mergedCells) {
      const [r, c] = m.primaryId.split('-').map(Number)
      const endR = r + m.rowSpan - 1
      if (r <= r1 && r2 <= endR) {
        const left = cols[c - 1] ?? 0
        const right = cols[c + m.colSpan - 1] ?? 100
        gaps.push([left, right])
      }
    }
    result.push(mergeGapsToSegments(gaps, 0, 100))
  }
  return result
}

/** 병합된 영역 내부를 제외한 세로 라인 세그먼트 [top%, bottom%][] */
export function getVerticalLineSegments(config: GridConfig): [number, number][][] {
  const { mergedCells, rows, cols } = config
  const result: [number, number][][] = []
  for (let i = 0; i < cols.length - 2; i++) {
    const c1 = i + 1
    const c2 = i + 2
    const gaps: [number, number][] = []
    for (const m of mergedCells) {
      const [r, c] = m.primaryId.split('-').map(Number)
      const endC = c + m.colSpan - 1
      if (c <= c1 && c2 <= endC) {
        const top = rows[r - 1] ?? 0
        const bottom = rows[r + m.rowSpan - 1] ?? 100
        gaps.push([top, bottom])
      }
    }
    result.push(mergeGapsToSegments(gaps, 0, 100))
  }
  return result
}

function mergeGapsToSegments(
  gaps: [number, number][],
  minVal: number,
  maxVal: number
): [number, number][] {
  if (gaps.length === 0) return [[minVal, maxVal]]
  const sorted = [...gaps].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  let [start, end] = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const [a, b] = sorted[i]
    if (a <= end) {
      end = Math.max(end, b)
    } else {
      merged.push([start, end])
      ;[start, end] = [a, b]
    }
  }
  merged.push([start, end])
  const segments: [number, number][] = []
  let pos = minVal
  for (const [a, b] of merged) {
    if (pos < a - 0.01) segments.push([pos, Math.min(a, maxVal)])
    pos = Math.max(pos, b)
  }
  if (pos < maxVal - 0.01) segments.push([pos, maxVal])
  return segments
}

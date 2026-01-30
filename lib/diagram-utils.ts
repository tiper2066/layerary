import Konva from 'konva'
import { jsPDF } from 'jspdf'
import pptxgen from 'pptxgenjs'

export type ShapeType =
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'triangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'roundedRect'
  | 'rectCut'
  | 'diamond'
  | 'parallelogram'
  | 'cylinder'
  | 'document'
  | 'blockArrowRight'
  | 'blockArrowLeft'
  | 'blockArrowUp'
  | 'blockArrowDown'
  | 'calloutRect'
  | 'calloutOval'
  | 'calloutCloud'

/** 툴바에서 선택 가능한 도구: 선택 + 모든 도형 타입 */
export type DiagramTool = 'select' | ShapeType

export interface Shape {
  id: string
  type: ShapeType
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  rotation?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  align?: 'left' | 'center' | 'right'
  points?: number[]
  pointerLength?: number
  pointerWidth?: number
  // polygon / diamond
  sides?: number
  // star
  innerRadius?: number
  outerRadius?: number
  numPoints?: number
  // roundedRect
  cornerRadius?: number
  // rectCut
  cutSize?: number
  // parallelogram
  skewX?: number
  // path-based (cylinder, document, calloutCloud, calloutOval 템플릿)
  pathData?: string
  // callout tail
  tailDirection?: 'top' | 'right' | 'bottom' | 'left'
  tailSize?: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 도형별 bbox 반환. Transformer·정렬·내보내기에서 공통 사용.
 */
export function getShapeBounds(shape: Shape): Bounds {
  const w = shape.width ?? 100
  const h = shape.height ?? 100
  const r = shape.radius ?? 50

  switch (shape.type) {
    case 'rect':
    case 'roundedRect':
    case 'parallelogram':
    case 'document':
    case 'blockArrowRight':
    case 'blockArrowLeft':
    case 'blockArrowUp':
    case 'blockArrowDown':
    case 'calloutRect':
      return { x: shape.x, y: shape.y, width: w, height: h }
    case 'calloutCloud':
      return { x: shape.x, y: shape.y, width: shape.width ?? 100, height: shape.height ?? 115 }
    case 'calloutOval': {
      const ow = shape.width ?? 160
      const oh = shape.height ?? 80
      const tail = shape.tailSize ?? 12
      return { x: shape.x - ow / 2, y: shape.y - oh / 2, width: ow, height: oh + tail }
    }
    case 'circle':
      return { x: shape.x, y: shape.y, width: r * 2, height: r * 2 }
    case 'triangle':
    case 'pentagon':
    case 'hexagon':
    case 'octagon':
    case 'diamond':
    case 'star': {
      const rad = shape.radius ?? shape.outerRadius ?? 50
      const size = rad * 2
      return { x: shape.x - rad, y: shape.y - rad, width: size, height: size }
    }
    case 'rectCut':
    case 'cylinder': {
      const pw = shape.width ?? 100
      const ph = shape.height ?? 80
      return { x: shape.x, y: shape.y, width: pw, height: ph }
    }
    case 'text': {
      const fs = shape.fontSize ?? 16
      const tw = (shape.text?.length ?? 0) * fs * 0.6
      const w = shape.width ?? Math.max(200, Math.max(40, tw))
      
      // 텍스트 줄바꿈 처리: 줄 수 계산
      const lines = (shape.text ?? '').split('\n').length
      const lineHeight = 1.2
      const h = Math.max(fs + 4, lines * fs * lineHeight + 4)
      
      return { x: shape.x, y: shape.y, width: w, height: h }
    }
    case 'arrow': {
      const pts = shape.points ?? [0, 0, 100, 0]
      const x1 = shape.x + pts[0]
      const y1 = shape.y + pts[1]
      const x2 = shape.x + pts[2]
      const y2 = shape.y + pts[3]
      const minX = Math.min(x1, x2)
      const minY = Math.min(y1, y2)
      const maxX = Math.max(x1, x2)
      const maxY = Math.max(y1, y2)
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      }
    }
    default:
      return { x: shape.x, y: shape.y, width: w, height: h }
  }
}

/**
 * PNG로 내보내기
 */
export async function exportToPNG(stage: Konva.Stage): Promise<Blob> {
  const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return blob
}

/**
 * JPG로 내보내기
 */
export async function exportToJPG(stage: Konva.Stage): Promise<Blob> {
  const dataUrl = stage.toDataURL({
    pixelRatio: 2,
    mimeType: 'image/jpeg',
    quality: 0.9,
  })
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return blob
}

/**
 * SVG로 내보내기 (도형 경계에 맞게 자동 크기 조정)
 */
export function exportToSVG(shapes: Shape[], width: number, height: number): string {
  if (shapes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`
  }

  // 모든 도형의 경계 계산
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  shapes.forEach((shape) => {
    const b = getShapeBounds(shape)
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  })

  // 여백 추가
  const padding = 20
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const svgWidth = Math.max(100, maxX - minX)
  const svgHeight = Math.max(100, maxY - minY)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="${minX} ${minY} ${svgWidth} ${svgHeight}">\n`

  shapes.forEach((shape) => {
    const fill = shape.fill || '#000000'
    const stroke = shape.stroke || 'none'
    const strokeWidth = shape.strokeWidth || 0

    if (shape.type === 'rect' && shape.width && shape.height) {
      svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`
    } else if (shape.type === 'circle' && shape.radius) {
      svg += `  <circle cx="${shape.x + shape.radius}" cy="${shape.y + shape.radius}" r="${shape.radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`
    } else if (shape.type === 'text') {
      const fontSize = shape.fontSize || 16
      const fontFamily = shape.fontFamily || 'Arial'
      const align = shape.align || 'left'
      const textAnchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
      svg += `  <text x="${shape.x}" y="${shape.y + fontSize}" text-anchor="${textAnchor}" font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}">${escapeXml(shape.text || '')}</text>\n`
    } else if (shape.type === 'arrow' && shape.points && shape.points.length >= 4) {
      const [x1, y1, x2, y2] = shape.points
      const absX1 = shape.x + x1
      const absY1 = shape.y + y1
      const absX2 = shape.x + x2
      const absY2 = shape.y + y2
      svg += `  <line x1="${absX1}" y1="${absY1}" x2="${absX2}" y2="${absY2}" stroke="${fill}" stroke-width="${strokeWidth || 2}" />\n`
      const angle = Math.atan2(absY2 - absY1, absX2 - absX1)
      const headLength = shape.pointerLength || 10
      const headWidth = shape.pointerWidth || 10
      const arrowPoint1X = absX2 - headLength * Math.cos(angle - Math.PI / 6)
      const arrowPoint1Y = absY2 - headLength * Math.sin(angle - Math.PI / 6)
      const arrowPoint2X = absX2 - headLength * Math.cos(angle + Math.PI / 6)
      const arrowPoint2Y = absY2 - headLength * Math.sin(angle + Math.PI / 6)
      svg += `  <polygon points="${absX2},${absY2} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}" fill="${fill}" />\n`
    } else if (shape.type === 'roundedRect' && shape.width && shape.height) {
      const r = shape.cornerRadius ?? 10
      svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="rotate(${shape.rotation ?? 0} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})" />\n`
    } else if ((shape.type === 'triangle' || shape.type === 'pentagon' || shape.type === 'hexagon' || shape.type === 'octagon') && shape.sides && shape.radius) {
      const pts = polygonPoints(shape.x, shape.y, shape.radius, shape.sides, shape.rotation ?? 0)
      svg += `  <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`
    } else if (shape.type === 'diamond' && shape.radius) {
      const pts = polygonPoints(shape.x, shape.y, shape.radius, 4, shape.rotation ?? 0)
      svg += `  <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`
    } else if (shape.type === 'star' && (shape.outerRadius ?? shape.radius)) {
      const outer = shape.outerRadius ?? shape.radius ?? 50
      const inner = shape.innerRadius ?? outer * 0.4
      const pts = starPoints(shape.x, shape.y, shape.numPoints ?? 5, outer, inner, shape.rotation ?? 0)
      svg += `  <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`
    } else if ((shape.type === 'parallelogram' || shape.type === 'rectCut') && shape.points && shape.points.length >= 6) {
      const abs = shape.points.map((p, i) => (i % 2 === 0 ? shape.x + p : shape.y + p))
      const pairs: string[] = []
      for (let i = 0; i < abs.length; i += 2) pairs.push(`${abs[i]},${abs[i + 1]}`)
      const rot = shape.rotation ?? 0
      const cx = shape.x + (shape.width ?? 100) / 2
      const cy = shape.y + (shape.height ?? 60) / 2
      svg += `  <polygon points="${pairs.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="rotate(${rot} ${cx} ${cy})" />\n`
    } else if ((shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft' || shape.type === 'blockArrowUp' || shape.type === 'blockArrowDown') && shape.width != null && shape.height != null) {
      const headLen = shape.pointerLength ?? 20
      const headW = shape.pointerWidth ?? 40
      const isHorz = shape.type === 'blockArrowRight' || shape.type === 'blockArrowLeft'
      const shaft = Math.max(1, isHorz ? shape.width - headLen : shape.height - headLen)
      const pts = getBlockArrowPoints(shape.type, shaft, headLen, headW)
      const abs = pts.map((p, i) => (i % 2 === 0 ? shape.x + p : shape.y + p))
      const pairs: string[] = []
      for (let i = 0; i < abs.length; i += 2) pairs.push(`${abs[i]},${abs[i + 1]}`)
      const rot = shape.rotation ?? 0
      const cx = shape.x + shape.width / 2
      const cy = shape.y + shape.height / 2
      svg += `  <polygon points="${pairs.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="rotate(${rot} ${cx} ${cy})" />\n`
    } else if ((shape.type === 'cylinder' || shape.type === 'document' || shape.type === 'calloutCloud') && shape.pathData) {
      svg += `  <path d="${shape.pathData}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="translate(${shape.x},${shape.y})${shape.rotation ? ` rotate(${shape.rotation} ${(shape.width ?? 100) / 2} ${(shape.height ?? 80) / 2})` : ''}" />\n`
    } else if (shape.type === 'calloutRect' && shape.width && shape.height) {
      const pathD = getCalloutRectPathData(shape)
      const rot = shape.rotation ?? 0
      svg += `  <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="translate(${shape.x},${shape.y})${rot ? ` rotate(${rot} ${shape.width / 2} ${shape.height / 2})` : ''}" />\n`
    } else if (shape.type === 'calloutOval' && shape.width && shape.height) {
      const pathD = getCalloutOvalPathData(shape)
      const w = shape.width
      const h = shape.height
      const rot = shape.rotation ?? 0
      if (shape.pathData) {
        // 템플릿 path (231x156): 위치·스케일·회전
        const scaleX = w / CALLOUT_OVAL_BASE_WIDTH
        const scaleY = h / CALLOUT_OVAL_BASE_HEIGHT
        const cx = 115.5
        const cy = 78
        svg += `  <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="translate(${shape.x - w / 2},${shape.y - h / 2}) scale(${scaleX},${scaleY})${rot ? ` rotate(${rot} ${cx} ${cy})` : ''}" />\n`
      } else {
        svg += `  <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" transform="translate(${shape.x - w / 2},${shape.y - h / 2})${rot ? ` rotate(${rot} ${w / 2} ${h / 2})` : ''}" />\n`
      }
    }
  })

  svg += `</svg>`
  return svg
}

/**
 * PPTX로 내보내기
 */
export async function exportToPPTX(
  shapes: Shape[],
  title: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<Blob> {
  const pptx = new pptxgen()
  
  // 슬라이드 크기 설정 (16:9 비율, 10 x 5.625 inches)
  pptx.layout = 'LAYOUT_16x9'
  
  const slide = pptx.addSlide()

  const scale = 10 / canvasWidth
  const fc = (c: string) => c.replace('#', '')
  const lineOpt = (s: Shape) =>
    (s.strokeWidth ?? 0) > 0
      ? { color: (s.stroke || '#000').replace('#', ''), width: s.strokeWidth ?? 0 }
      : undefined

  shapes.forEach((shape) => {
    const fill = shape.fill || '#000000'
    const stroke = shape.stroke || 'none'
    const strokeWidth = shape.strokeWidth || 0
    const rotation = shape.rotation || 0
    const b = getShapeBounds(shape)
    const xInch = b.x * scale
    const yInch = b.y * scale
    const wInch = b.width * scale
    const hInch = b.height * scale

    try {
      if (shape.type === 'rect' && shape.width && shape.height) {
        slide.addShape(pptx.ShapeType.rect, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'circle' && shape.radius) {
        const d = shape.radius * 2 * scale
        slide.addShape(pptx.ShapeType.ellipse, {
          x: xInch,
          y: yInch,
          w: d,
          h: d,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'text') {
        slide.addText(shape.text ?? '', {
          x: xInch,
          y: yInch,
          fontSize: shape.fontSize || 16,
          color: fc(fill),
          fontFace: shape.fontFamily || 'Arial',
          rotate: rotation,
        })
      } else if (shape.type === 'arrow' && shape.points && shape.points.length >= 4) {
        const [x1, y1, x2, y2] = shape.points
        const absX1 = shape.x + x1
        const absY1 = shape.y + y1
        const absX2 = shape.x + x2
        const absY2 = shape.y + y2
        slide.addShape(pptx.ShapeType.line, {
          x: absX1 * scale,
          y: absY1 * scale,
          w: (absX2 - absX1) * scale,
          h: (absY2 - absY1) * scale,
          line: {
            color: fc(fill),
            width: strokeWidth || 2,
            endArrowType: 'arrow',
          },
          rotate: rotation,
        })
      } else if (shape.type === 'roundedRect' && shape.width && shape.height) {
        const r = Math.min(0.5, ((shape.cornerRadius ?? 10) * 2) / Math.min(shape.width, shape.height))
        slide.addShape(pptx.ShapeType.roundRect, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rectRadius: r,
          rotate: rotation,
        })
      } else if (shape.type === 'triangle' && shape.radius) {
        slide.addShape(pptx.ShapeType.triangle, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'pentagon' && shape.radius) {
        slide.addShape(pptx.ShapeType.pentagon, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'hexagon' && shape.radius) {
        slide.addShape(pptx.ShapeType.hexagon, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'octagon' && shape.radius) {
        slide.addShape(pptx.ShapeType.octagon, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'diamond' && shape.radius) {
        slide.addShape(pptx.ShapeType.diamond, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'star') {
        slide.addShape(pptx.ShapeType.ellipse, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'blockArrowRight') {
        slide.addShape(pptx.ShapeType.rightArrow, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'blockArrowLeft') {
        slide.addShape(pptx.ShapeType.leftArrow, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'blockArrowUp') {
        slide.addShape(pptx.ShapeType.upArrow, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'blockArrowDown') {
        slide.addShape(pptx.ShapeType.downArrow, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'parallelogram') {
        slide.addShape(pptx.ShapeType.flowChartInputOutput, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'cylinder') {
        slide.addShape(pptx.ShapeType.can, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'document') {
        slide.addShape(pptx.ShapeType.flowChartDocument, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'calloutRect' && shape.width && shape.height) {
        const r = Math.min(0.5, ((shape.cornerRadius ?? 8) * 2) / Math.min(shape.width, shape.height))
        slide.addShape(pptx.ShapeType.roundRect, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rectRadius: r,
          rotate: rotation,
        })
      } else if (shape.type === 'calloutOval' && shape.width && shape.height) {
        slide.addShape(pptx.ShapeType.ellipse, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'calloutCloud') {
        slide.addShape(pptx.ShapeType.cloudCallout, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      } else if (shape.type === 'rectCut' && shape.width && shape.height) {
        slide.addShape(pptx.ShapeType.rect, {
          x: xInch,
          y: yInch,
          w: wInch,
          h: hInch,
          fill: { color: fc(fill) },
          line: lineOpt(shape),
          rotate: rotation,
        })
      }
    } catch (error) {
      console.error('Error adding shape to PPTX:', shape.type, error)
    }
  })

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob
  return blob
}

/**
 * 썸네일 생성 (Data URL)
 */
export function generateThumbnailDataUrl(stage: Konva.Stage): string {
  const dataUrl = stage.toDataURL({
    pixelRatio: 0.25, // 1/4 크기
    mimeType: 'image/png',
  })
  return dataUrl
}

/**
 * 파일 다운로드 헬퍼
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * XML 이스케이프
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function polygonPoints(cx: number, cy: number, radius: number, sides: number, rotationDeg: number): string {
  const rot = (rotationDeg * Math.PI) / 180
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * 2 * Math.PI) / sides - Math.PI / 2
    pts.push(`${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`)
  }
  return pts.join(' ')
}

function starPoints(cx: number, cy: number, numPoints: number, outerR: number, innerR: number, rotationDeg: number): string {
  const rot = (rotationDeg * Math.PI) / 180
  const pts: string[] = []
  const n = numPoints * 2
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI) / numPoints - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

/**
 * 사각 말풍선 Path 데이터 (둥근 사각형 + 꼬리). 좌상단 (0,0), 전체 크기 (w, h). h에는 꼬리 높이 포함.
 * tailDirection에 따라 꼬리 위치: bottom이면 하단 중앙.
 */
export function getCalloutRectPathData(shape: Shape): string {
  const w = shape.width ?? 120
  const h = shape.height ?? 72 // body + tail
  const tailSize = shape.tailSize ?? 12
  const bodyH = h - tailSize
  const r = Math.min(shape.cornerRadius ?? 8, w / 4, bodyH / 4)
  const dir = shape.tailDirection ?? 'bottom'
  const tailW = tailSize * 1.2
  const cx = w / 2

  if (dir === 'bottom') {
    // 둥근 사각형 하단 중앙에 삼각형 꼬리
    return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${bodyH - r} Q ${w} ${bodyH} ${w - r} ${bodyH} L ${cx + tailW / 2} ${bodyH} L ${cx} ${h} L ${cx - tailW / 2} ${bodyH} L ${r} ${bodyH} Q 0 ${bodyH} 0 ${bodyH - r} L 0 ${r} Q 0 0 ${r} 0 Z`
  }
  if (dir === 'top') {
    return `M ${r} ${tailSize} L ${cx - tailW / 2} ${tailSize} L ${cx} 0 L ${cx + tailW / 2} ${tailSize} L ${w - r} ${tailSize} Q ${w} ${tailSize} ${w} ${tailSize + r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${tailSize + r} Q 0 ${tailSize} ${r} ${tailSize} Z`
  }
  if (dir === 'right') {
    return `M ${r} 0 L ${w - r - tailSize} 0 Q ${w - tailSize} 0 ${w - tailSize} ${r} L ${w - tailSize} ${h / 2 - tailW / 2} L ${w} ${h / 2} L ${w - tailSize} ${h / 2 + tailW / 2} L ${w - tailSize} ${h - r} Q ${w - tailSize} ${h} ${w - tailSize - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
  }
  // left: body (tailSize,0)-(w,h), 꼬리 왼쪽 중앙
  return `M ${r + tailSize} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r + tailSize} ${h} Q ${tailSize} ${h} ${tailSize} ${h - r} L ${tailSize} ${h / 2 + tailW / 2} L 0 ${h / 2} L ${tailSize} ${h / 2 - tailW / 2} L ${tailSize} ${r} Q ${tailSize} 0 ${r + tailSize} 0 Z`
}

/** 원형 말풍선 SVG 템플릿 path (viewBox 0 0 231 156, 몸통+꼬리 한 경로) */
export const CALLOUT_OVAL_PATH_TEMPLATE =
  'M115.5 0.5C147.319 0.5 176.102 8.26144 196.913 20.7842C217.734 33.3128 230.5 50.552 230.5 69.5C230.5 87.5011 218.98 103.958 199.973 116.302C180.972 128.642 154.554 136.823 124.945 138.269L124.673 138.281L124.537 138.518L115.499 154.171L106.462 138.518L106.326 138.281L106.054 138.269L104.668 138.195C75.6217 136.565 49.7307 128.449 31.0273 116.302C12.0205 103.958 0.5 87.5011 0.5 69.5C0.5 50.552 13.2659 33.3128 34.0869 20.7842C54.8981 8.26144 83.6809 0.5 115.5 0.5Z'

export const CALLOUT_OVAL_BASE_WIDTH = 231
export const CALLOUT_OVAL_BASE_HEIGHT = 156

/**
 * 원형 말풍선 Path 데이터. pathData가 있으면 템플릿 사용 중(스케일만 적용).
 * 없으면 레거시(타원+꼬리) 생성.
 */
export function getCalloutOvalPathData(shape: Shape): string {
  if (shape.pathData) return shape.pathData
  const w = shape.width ?? 160
  const bodyH = shape.height ?? 80
  const tailSize = shape.tailSize ?? 12
  const h = bodyH + tailSize
  const rx = w / 2
  const ry = bodyH / 2
  const dir = shape.tailDirection ?? 'bottom'
  const tailW = tailSize * 1.2
  const cx = w / 2
  const cy = bodyH / 2
  const ellipsePath = `M ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy} Z`
  if (dir === 'bottom') {
    const triangle = `M ${cx - tailW / 2} ${bodyH} L ${cx} ${h} L ${cx + tailW / 2} ${bodyH} Z`
    return `${ellipsePath} ${triangle}`
  }
  if (dir === 'top') {
    const triangle = `M ${cx - tailW / 2} ${tailSize} L ${cx} 0 L ${cx + tailW / 2} ${tailSize} Z`
    return `${ellipsePath} ${triangle}`
  }
  if (dir === 'right') {
    const triangle = `M ${w - tailSize} ${cy - tailW / 2} L ${w} ${cy} L ${w - tailSize} ${cy + tailW / 2} Z`
    return `${ellipsePath} ${triangle}`
  }
  const triangle = `M ${tailSize} ${cy - tailW / 2} L 0 ${cy} L ${tailSize} ${cy + tailW / 2} Z`
  return `${ellipsePath} ${triangle}`
}

type BlockArrowType = 'blockArrowRight' | 'blockArrowLeft' | 'blockArrowUp' | 'blockArrowDown'

/**
 * 블록 화살표 꼭짓점 생성. 몸통(shaft) 길이·머리 길이·머리 너비로 분리.
 * R/L: shaft=가로, headWidth=높이. U/D: shaft=세로, headWidth=가로.
 */
export function getBlockArrowPoints(
  type: BlockArrowType,
  shaftLength: number,
  headLength: number,
  headWidth: number
): number[] {
  const w = type === 'blockArrowRight' || type === 'blockArrowLeft' ? shaftLength + headLength : headWidth
  const h = type === 'blockArrowRight' || type === 'blockArrowLeft' ? headWidth : shaftLength + headLength
  if (type === 'blockArrowRight') {
    return [0, h / 2, shaftLength, h / 2, shaftLength, 0, w, h / 2, shaftLength, h, shaftLength, h / 2]
  }
  if (type === 'blockArrowLeft') {
    return [w, h / 2, headLength, h / 2, headLength, 0, 0, h / 2, headLength, h, headLength, h / 2]
  }
  if (type === 'blockArrowUp') {
    return [w / 2, h, w / 2, headLength, 0, headLength, w / 2, 0, w, headLength, w / 2, headLength]
  }
  return [w / 2, 0, w / 2, h - headLength, 0, h - headLength, w / 2, h, w, h - headLength, w / 2, h - headLength]
}

/**
 * 랜덤 ID 생성
 */
export function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const DEFAULT_FILL = '#3b82f6'
const DEFAULT_STROKE = '#1e40af'

/**
 * 기본 도형 생성
 */
export function createShape(type: ShapeType, x: number, y: number): Shape {
  const id = generateId()

  switch (type) {
    case 'rect':
      return {
        id,
        type: 'rect',
        x,
        y,
        width: 100,
        height: 100,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'circle':
      return {
        id,
        type: 'circle',
        x,
        y,
        radius: 50,
        fill: '#10b981',
        stroke: '#059669',
        strokeWidth: 2,
      }
    case 'text':
      return {
        id,
        type: 'text',
        x,
        y,
        width: 200,
        text: '텍스트',
        fontSize: 24,
        fontFamily: 'Arial',
        align: 'left',
        fill: '#000000',
      }
    case 'arrow':
      return {
        id,
        type: 'arrow',
        x,
        y,
        points: [0, 0, 100, 0],
        fill: '#ef4444',
        strokeWidth: 3,
        pointerLength: 10,
        pointerWidth: 10,
      }
    case 'triangle':
      return {
        id,
        type: 'triangle',
        x,
        y,
        sides: 3,
        radius: 50,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'pentagon':
      return {
        id,
        type: 'pentagon',
        x,
        y,
        sides: 5,
        radius: 50,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'hexagon':
      return {
        id,
        type: 'hexagon',
        x,
        y,
        sides: 6,
        radius: 50,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'octagon':
      return {
        id,
        type: 'octagon',
        x,
        y,
        sides: 8,
        radius: 50,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'star':
      return {
        id,
        type: 'star',
        x,
        y,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 50,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'roundedRect':
      return {
        id,
        type: 'roundedRect',
        x,
        y,
        width: 100,
        height: 60,
        cornerRadius: 10,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'rectCut': {
      const w = 100
      const h = 60
      const cut = 15
      const pts = [0, 0, w - cut, 0, w, cut, w, h, 0, h]
      return {
        id,
        type: 'rectCut',
        x,
        y,
        width: w,
        height: h,
        cutSize: cut,
        points: pts,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'diamond':
      return {
        id,
        type: 'diamond',
        x,
        y,
        sides: 4,
        radius: 50,
        rotation: 0,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    case 'parallelogram': {
      const w = 100
      const h = 60
      const skew = 15
      const pts = [skew, 0, w + skew, 0, w - skew, h, -skew, h]
      return {
        id,
        type: 'parallelogram',
        x,
        y,
        width: w,
        height: h,
        skewX: skew,
        points: pts,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'cylinder': {
      const w = 80
      const h = 60
      const cy = h * 0.3
      const pathData = `M 0 ${cy} Q ${w / 2} 0 ${w} ${cy} L ${w} ${h - cy} Q ${w / 2} ${h} 0 ${h - cy} Z`
      return {
        id,
        type: 'cylinder',
        x,
        y,
        width: w,
        height: h,
        pathData,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'document': {
      const w = 80
      const h = 100
      const fold = 15
      const pathData = `M 0 0 L ${w - fold} 0 L ${w} ${fold} L ${w} ${h} L 0 ${h} Z M ${w - fold} 0 L ${w - fold} ${fold} L ${w} ${fold}`
      return {
        id,
        type: 'document',
        x,
        y,
        width: w,
        height: h,
        pathData,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'blockArrowRight': {
      const shaft = 80
      const head = 20
      const headW = 40
      return {
        id,
        type: 'blockArrowRight',
        x,
        y,
        width: shaft + head,
        height: headW,
        pointerLength: head,
        pointerWidth: headW,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'blockArrowLeft': {
      const shaft = 80
      const head = 20
      const headW = 40
      return {
        id,
        type: 'blockArrowLeft',
        x,
        y,
        width: shaft + head,
        height: headW,
        pointerLength: head,
        pointerWidth: headW,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'blockArrowUp': {
      const shaft = 80
      const head = 20
      const headW = 40
      return {
        id,
        type: 'blockArrowUp',
        x,
        y,
        width: headW,
        height: shaft + head,
        pointerLength: head,
        pointerWidth: headW,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'blockArrowDown': {
      const shaft = 80
      const head = 20
      const headW = 40
      return {
        id,
        type: 'blockArrowDown',
        x,
        y,
        width: headW,
        height: shaft + head,
        pointerLength: head,
        pointerWidth: headW,
        fill: DEFAULT_FILL,
        stroke: DEFAULT_STROKE,
        strokeWidth: 2,
      }
    }
    case 'calloutRect':
      return {
        id,
        type: 'calloutRect',
        x,
        y,
        width: 120,
        height: 72, // body 60 + tail 12
        cornerRadius: 8,
        tailDirection: 'bottom',
        tailSize: 12,
        fill: '#fef3c7',
        stroke: '#f59e0b',
        strokeWidth: 2,
      }
    case 'calloutOval':
      return {
        id,
        type: 'calloutOval',
        x,
        y,
        width: CALLOUT_OVAL_BASE_WIDTH,
        height: CALLOUT_OVAL_BASE_HEIGHT,
        pathData: CALLOUT_OVAL_PATH_TEMPLATE,
        tailDirection: 'bottom',
        fill: '#fef3c7',
        stroke: '#f59e0b',
        strokeWidth: 2,
      }
    case 'calloutCloud': {
      // 구름 말풍선: 구름 몸통 + 좌측 하단 방향으로 원 2개를 꼬리처럼 배치
      const pathData =
        'M 50 25 Q 70 10 85 25 Q 95 20 100 35 Q 110 40 105 55 Q 110 70 95 75 Q 90 90 70 85 Q 50 95 35 80 Q 15 85 20 65 Q 5 50 25 40 Q 20 25 50 25 Z M 35 98 m 6 0 a 6 6 0 1 1 -12 0 a 6 6 0 1 1 12 0 M 24 108 m 5 0 a 5 5 0 1 1 -10 0 a 5 5 0 1 1 10 0'
      return {
        id,
        type: 'calloutCloud',
        x,
        y,
        width: 100,
        height: 115, // 구름+꼬리(원 2개) 높이
        pathData,
        tailDirection: 'bottom',
        tailSize: 15,
        fill: '#fef3c7',
        stroke: '#f59e0b',
        strokeWidth: 2,
      }
    }
    default:
      throw new Error(`Unknown shape type: ${type}`)
  }
}

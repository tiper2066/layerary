'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ChartSettings, ChartType, CHART_TYPE_NAMES } from '@/lib/chart-schemas'
import PptxGenJS from 'pptxgenjs'
import { parse as parseFont, type Font } from 'opentype.js'

const PRETENDARD_OTF =
  'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf'

let cachedFont: Font | null = null

async function loadPretendard(): Promise<Font> {
  if (cachedFont) return cachedFont
  const res = await fetch(PRETENDARD_OTF)
  if (!res.ok) throw new Error('Pretendard font load failed')
  const buf = await res.arrayBuffer()
  cachedFont = parseFont(buf)
  return cachedFont
}

function parseFirstNum(s: string | null): number {
  if (!s || !s.trim()) return 0
  const m = s.trim().match(/^-?[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

/** SVG 내 <text>를 폰트 윤곽선 path로 치환 (벡터 도형화, Illustrator 등에서 폰트 불필요) */
function convertSvgTextToPaths(svgElement: SVGElement, font: Font): string {
  const ns = 'http://www.w3.org/2000/svg'
  const texts = Array.from(svgElement.querySelectorAll('text'))
  const infos: Array<{
    text: string
    x: number
    y: number
    fontSize: number
    fill: string
    transform: string | null
    anchor: string
  }> = []

  for (const el of texts) {
    const raw = (el.textContent || '').trim()
    if (!raw) continue
    const style = window.getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize) || 12
    let fill = (el.getAttribute('fill') || style.fill || '#333').trim()
    if (fill === 'none' || !fill) fill = '#333'
    const x = parseFirstNum(el.getAttribute('x'))
    const y = parseFirstNum(el.getAttribute('y'))
    const transform = el.getAttribute('transform')
    const anchor = (el.getAttribute('text-anchor') || 'start').trim()
    infos.push({ text: raw, x, y, fontSize, fill, transform, anchor })
  }

  const clone = svgElement.cloneNode(true) as SVGElement
  const cloneTexts = Array.from(clone.querySelectorAll('text'))
  let idx = 0

  for (const el of cloneTexts) {
    const raw = (el.textContent || '').trim()
    if (!raw) {
      el.remove()
      continue
    }
    const info = infos[idx++]
    if (!info) continue

    try {
      const advance = font.getAdvanceWidth(info.text, info.fontSize)
      let ox = info.x
      if (info.anchor === 'middle') ox -= advance / 2
      else if (info.anchor === 'end') ox -= advance

      const path = font.getPath(info.text, 0, 0, info.fontSize)
      path.fill = info.fill
      const d = path.toPathData(2)
      const pathEl = document.createElementNS(ns, 'path')
      pathEl.setAttribute('d', d)
      pathEl.setAttribute('fill', info.fill)

      const scale = info.fontSize / font.unitsPerEm
      const ascenderPx = font.ascender * scale
      // Y축(좌/우): path bbox 수직 중심을 그리드 라인에 맞춤
      const isYAxis = info.anchor === 'end' || info.anchor === 'start'
      let oy: number
      if (isYAxis) {
        const box = path.getBoundingBox()
        const centerY = (box.y1 + box.y2) * 0.5
        oy = info.y - centerY
      } else {
        oy = info.y + ascenderPx
      }

      const g = document.createElementNS(ns, 'g')
      g.setAttribute('transform', `translate(${ox},${oy})`)
      g.appendChild(pathEl)

      if (info.transform) {
        const wrap = document.createElementNS(ns, 'g')
        wrap.setAttribute('transform', info.transform)
        wrap.appendChild(g)
        el.parentNode?.replaceChild(wrap, el)
      } else {
        el.parentNode?.replaceChild(g, el)
      }
    } catch {
      // 글리프 없음 등 변환 실패 시 기존 <text> 유지
    }
  }

  return new XMLSerializer().serializeToString(clone)
}

/** SVG → Image → Canvas 래스터화 (Canvg 대체, 빈 화면 이슈 방지) */
async function renderSvgToCanvas(
  svgElement: SVGElement,
  width: number,
  height: number,
  scale: number = 1
): Promise<HTMLCanvasElement> {
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  let svgStr = new XMLSerializer().serializeToString(svgElement)
  if (!svgElement.getAttribute('width') || !svgElement.getAttribute('height')) {
    svgStr = svgStr.replace(
      /<svg([^>]*)>/,
      (_, attrs) => `<svg${attrs} width="${width}" height="${height}">`
    )
  }
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2d context not available'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG as image'))
    }
    img.src = url
  })
}

interface ChartExportControlsProps {
  chartRef: React.RefObject<HTMLDivElement>
  settings: ChartSettings
  chartType: ChartType
  data: Array<{ name: string; value: number }>
  title?: string
  description?: string
}

export function ChartExportControls({
  chartRef,
  settings,
  chartType,
  data,
  title,
  description,
}: ChartExportControlsProps) {
  const [exporting, setExporting] = useState<'svg' | 'png' | 'jpg' | 'ppt' | 'ppt-native' | null>(null)

  // 파일명 생성 헬퍼 함수 (ChartType-YYMMDD.ext 형식)
  const generateFileName = (extension: string) => {
    const chartName = CHART_TYPE_NAMES[chartType]
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${chartName}-${yy}${mm}${dd}.${extension}`
  }

  const downloadSVG = async () => {
    if (!chartRef.current) return

    setExporting('svg')

    try {
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        toast.error('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const font = await loadPretendard()
      let svgData = convertSvgTextToPaths(svgElement, font)

      if (title) {
        svgData = svgData.replace(
          /<svg([^>]*)>/,
          `<svg$1><title>${title}</title>`
        )
      }

      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = generateFileName('svg')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('SVG 다운로드 오류:', error)
      toast.error('SVG 다운로드 중 오류가 발생했습니다.')
    } finally {
      setExporting(null)
    }
  }

  // PNG 다운로드
  const downloadPNG = async () => {
    if (!chartRef.current) return

    setExporting('png')
    
    try {
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        toast.error('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const scale = settings.highResolution ? 2 : 1
      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width), 10)
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height), 10)
      const canvas = await renderSvgToCanvas(svgElement, svgWidth, svgHeight, scale)

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('이미지 변환에 실패했습니다.')
          setExporting(null)
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = generateFileName('png')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setExporting(null)
      }, 'image/png')
    } catch (error) {
      console.error('PNG 다운로드 오류:', error)
      toast.error('PNG 다운로드 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  // JPG 다운로드
  const downloadJPG = async () => {
    if (!chartRef.current) return

    setExporting('jpg')
    
    try {
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        toast.error('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const scale = settings.highResolution ? 2 : 1
      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width), 10)
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height), 10)
      const canvas = await renderSvgToCanvas(svgElement, svgWidth, svgHeight, scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('Canvas를 생성할 수 없습니다.')
        setExporting(null)
        return
      }

      // JPG는 투명 배경 미지원이므로 렌더링 후 흰색 배경 추가 (뒤에 그리기)
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('이미지 변환에 실패했습니다.')
          setExporting(null)
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = generateFileName('jpg')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setExporting(null)
      }, 'image/jpeg', 0.95)
    } catch (error) {
      console.error('JPG 다운로드 오류:', error)
      toast.error('JPG 다운로드 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  const downloadPPT = async () => {
    if (!chartRef.current) return

    setExporting('ppt')
    
    try {
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        toast.error('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const scale = 2
      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width), 10)
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height), 10)
      const canvas = await renderSvgToCanvas(svgElement, svgWidth, svgHeight, scale)

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('이미지 변환에 실패했습니다.')
          setExporting(null)
          return
        }

        try {
          // PPT 생성
          const pptx = new PptxGenJS()
          
          // 슬라이드 추가
          const slide = pptx.addSlide()
          
          // 제목이 있으면 추가
          if (title) {
            slide.addText(title, {
              x: 0.5,
              y: 0.3,
              w: 9,
              h: 0.5,
              fontSize: 24,
              bold: true,
              align: 'center',
            })
          }

          // 설명이 있으면 추가
          if (description) {
            slide.addText(description, {
              x: 0.5,
              y: title ? 0.9 : 0.3,
              w: 9,
              h: 0.5,
              fontSize: 14,
              align: 'center',
              color: '666666',
            })
          }

          // 이미지를 Base64로 변환
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64Image = reader.result as string
            
            // 차트 이미지 추가 (제목/설명 아래에 배치)
            const imageY = title || description ? (title && description ? 1.5 : 1.0) : 0.5
            
            // 슬라이드 크기 (인치): 기본 와이드스크린 10 x 7.5
            const slideWidth = 10
            const slideHeight = 7.5
            const slideMargin = 0.5
            
            // 사용 가능한 영역
            const availableWidth = slideWidth - (slideMargin * 2)
            const availableHeight = slideHeight - imageY - slideMargin
            
            // 차트 비율 계산
            const chartAspectRatio = svgWidth / svgHeight
            
            // 비율을 유지하면서 슬라이드에 맞추기
            let imageWidth: number
            let imageHeight: number
            
            if (availableWidth / availableHeight > chartAspectRatio) {
              // 높이에 맞추기
              imageHeight = availableHeight
              imageWidth = imageHeight * chartAspectRatio
            } else {
              // 너비에 맞추기
              imageWidth = availableWidth
              imageHeight = imageWidth / chartAspectRatio
            }
            
            // 중앙 정렬
            const imageX = (slideWidth - imageWidth) / 2
            
            slide.addImage({
              data: base64Image,
              x: imageX,
              y: imageY,
              w: imageWidth,
              h: imageHeight,
            })

            // PPT 다운로드
            pptx.writeFile({ fileName: generateFileName('pptx') })
            setExporting(null)
          }
          reader.readAsDataURL(blob)
        } catch (error) {
          console.error('PPT 생성 오류:', error)
          toast.error('PPT 생성 중 오류가 발생했습니다.')
          setExporting(null)
        }
      }, 'image/png')
    } catch (error) {
      console.error('PPT 다운로드 오류:', error)
      toast.error('PPT 다운로드 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  // 네이티브 PPT 차트 다운로드 (편집 가능)
  const downloadNativePPT = async () => {
    if (data.length === 0) {
      toast.error('차트 데이터가 없습니다.')
      return
    }

    setExporting('ppt-native')

    try {
      const pptx = new PptxGenJS()
      const slide = pptx.addSlide()

      // 제목 추가
      if (title) {
        slide.addText(title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.5,
          fontSize: 24,
          bold: true,
          align: 'center',
        })
      }

      // 설명 추가
      if (description) {
        slide.addText(description, {
          x: 0.5,
          y: title ? 0.9 : 0.3,
          w: 9,
          h: 0.5,
          fontSize: 14,
          align: 'center',
          color: '666666',
        })
      }

      // 차트 위치 계산 (16:9 와이드스크린 기준: 10" x 5.625")
      const chartY = title || description ? (title && description ? 1.2 : 0.8) : 0.3
      const chartHeight = 5.0 - chartY - 0.3

      // 차트 데이터 준비
      const chartData = [{
        name: '값',
        labels: data.map(d => d.name),
        values: data.map(d => d.value),
      }]

      // 차트 색상 준비 (6자리 hex만 사용, # 제거)
      const chartColors = settings.colors.map(c => c.replace('#', '').toUpperCase())

      // pptxgenjs 차트 타입 매핑
      const getPptxChartType = (): PptxGenJS.CHART_NAME => {
        switch (chartType) {
          case 'bar':
            return pptx.ChartType.bar
          case 'line':
            return pptx.ChartType.line
          case 'pie':
            return pptx.ChartType.pie
          case 'area':
            return pptx.ChartType.area
          default:
            return pptx.ChartType.bar
        }
      }

      // 차트 옵션
      const chartOptions: PptxGenJS.IChartOpts = {
        x: 0.5,
        y: chartY,
        w: 9,
        h: chartHeight,
        chartColors: chartColors,
        showLegend: true,
        legendPos: 'b',
        showTitle: false,
        dataLabelFontSize: settings.valueFontSize || 12,
        catAxisLabelFontSize: settings.labelFontSize || 12,
        valAxisLabelFontSize: settings.valueFontSize || 12,
      }

      // Pie 차트의 경우 추가 옵션
      if (chartType === 'pie') {
        chartOptions.showPercent = true
        chartOptions.showValue = false
      }

      // 차트 추가
      slide.addChart(getPptxChartType(), chartData, chartOptions)

      // PPT 다운로드
      await pptx.writeFile({ fileName: generateFileName('pptx') })
      setExporting(null)
    } catch (error) {
      console.error('네이티브 PPT 다운로드 오류:', error)
      toast.error('PPT 생성 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  return (
    <div className="space-y-3 pt-10 border-t">
      <div className="space-y-3">
        <div className="flex flex-col gap-3">
          {/* PNG, JPG, SVG 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadPNG}
              disabled={exporting !== null}
              className="flex-1"
            >
              {exporting === 'png' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'PNG 다운'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadJPG}
              disabled={exporting !== null}
              className="flex-1"
            >
              {exporting === 'jpg' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'JPG 다운'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadSVG}
              disabled={exporting !== null}
              className="flex-1"
            >
              {exporting === 'svg' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'SVG 다운'
              )}
            </Button>
          </div>

          {/* PPT 다운로드 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={downloadPPT}
              disabled={exporting !== null}
              className="flex-1"
            >
              {exporting === 'ppt' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  PPT 이미지
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={downloadNativePPT}
              disabled={exporting !== null}
              className="flex-1"
            >
              {exporting === 'ppt-native' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  PPT 편집 가능
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * &quot;PPT 이미지&quot; 다운로드는 이미지로 변환된 차트가 PPT에 포함됩니다.<br />
            * &quot;PPT 편집가능&quot; 다운로드는 차트가 실제 PowerPoint 차트 객체로<br />&nbsp;&nbsp;&nbsp;생성되어, PPT에서 데이터와 레이블을 편집할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

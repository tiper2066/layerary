'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileDown, Loader2, FileEdit } from 'lucide-react'
import { ChartSettings, ChartType, CHART_TYPE_NAMES } from '@/lib/chart-schemas'
import { Canvg } from 'canvg'
import PptxGenJS from 'pptxgenjs'

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

  const downloadSVG = () => {
    if (!chartRef.current) return

    setExporting('svg')
    
    try {
      // Recharts SVG 요소 찾기
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        alert('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      // SVG 데이터 추출
      const svgData = new XMLSerializer().serializeToString(svgElement)
      
      // 제목이 있으면 SVG에 추가
      let finalSvg = svgData
      if (title) {
        // SVG 루트 요소에 제목 추가
        finalSvg = svgData.replace(
          /<svg([^>]*)>/,
          `<svg$1><title>${title}</title>`
        )
      }

      // Blob 생성 및 다운로드
      const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' })
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
      alert('SVG 다운로드 중 오류가 발생했습니다.')
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
        alert('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const scale = settings.highResolution ? 2 : 1
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        alert('Canvas를 생성할 수 없습니다.')
        setExporting(null)
        return
      }

      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width))
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height))
      
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale
      
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const v = await Canvg.fromString(ctx, svgData, {
        ignoreMouse: true,
        ignoreAnimation: true,
        scaleWidth: scale,
        scaleHeight: scale,
      } as Parameters<typeof Canvg.fromString>[2])
      await v.render()

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 변환에 실패했습니다.')
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
      alert('PNG 다운로드 중 오류가 발생했습니다.')
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
        alert('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      const scale = settings.highResolution ? 2 : 1
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        alert('Canvas를 생성할 수 없습니다.')
        setExporting(null)
        return
      }

      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width))
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height))
      
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale
      
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const v = await Canvg.fromString(ctx, svgData, {
        ignoreMouse: true,
        ignoreAnimation: true,
        scaleWidth: scale,
        scaleHeight: scale,
      } as Parameters<typeof Canvg.fromString>[2])
      await v.render()

      // JPG는 투명 배경 미지원이므로 렌더링 후 흰색 배경 추가 (뒤에 그리기)
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over' // 원래대로 복원

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 변환에 실패했습니다.')
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
      alert('JPG 다운로드 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  const downloadPPT = async () => {
    if (!chartRef.current) return

    setExporting('ppt')
    
    try {
      // Recharts SVG 요소 찾기
      const svgElement = chartRef.current.querySelector('.recharts-wrapper svg') as SVGElement
      if (!svgElement) {
        alert('차트를 찾을 수 없습니다.')
        setExporting(null)
        return
      }

      // SVG를 Canvas로 변환 (고해상도)
      const scale = 2 // 2x 해상도
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        alert('Canvas를 생성할 수 없습니다.')
        setExporting(null)
        return
      }

      // SVG 크기 계산
      const svgWidth = parseInt(svgElement.getAttribute('width') || String(settings.width))
      const svgHeight = parseInt(svgElement.getAttribute('height') || String(settings.height))
      
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale
      
      // SVG를 Canvas로 렌더링
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const v = await Canvg.fromString(ctx, svgData, {
        ignoreMouse: true,
        ignoreAnimation: true,
        scaleWidth: scale,
        scaleHeight: scale,
      } as Parameters<typeof Canvg.fromString>[2])
      await v.render()

      // Canvas를 PNG로 변환
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('이미지 변환에 실패했습니다.')
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
          alert('PPT 생성 중 오류가 발생했습니다.')
          setExporting(null)
        }
      }, 'image/png')
    } catch (error) {
      console.error('PPT 다운로드 오류:', error)
      alert('PPT 다운로드 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  // 네이티브 PPT 차트 다운로드 (편집 가능)
  const downloadNativePPT = async () => {
    if (data.length === 0) {
      alert('차트 데이터가 없습니다.')
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
      alert('PPT 생성 중 오류가 발생했습니다.')
      setExporting(null)
    }
  }

  return (
    <div className="space-y-3 pt-10 border-t">
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
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
                  <FileDown className="h-4 w-4" />
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
                  <FileEdit className="h-4 w-4" />
                  PPT 편집 가능
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * PPT 이미지 다운로드는 이미지로 변환된 차트가 포함됩니다.<br />
            * PPT 편집가능 다운로드는 차트가 실제 PowerPoint 차트 객체로 생성되어, PPT에서 데이터와 레이블을 편집할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

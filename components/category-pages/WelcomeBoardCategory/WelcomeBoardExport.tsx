'use client'

import { useState, useCallback, RefObject, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileImage, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { WelcomeBoardTemplate, UserEditData, ExportFormat, TemplateConfig } from '@/lib/welcomeboard-schemas'
import { generateFileName } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardExportProps {
  template: WelcomeBoardTemplate
  userEditData: UserEditData
  canvasRef: RefObject<HTMLDivElement | null>
}

export function WelcomeBoardExport({
  template,
  userEditData,
  canvasRef,
}: WelcomeBoardExportProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [highResolution, setHighResolution] = useState(true)

  const config = template.config as TemplateConfig

  // 텍스트 값 계산 (사용자 입력 또는 기본값)
  const textValues = useMemo(() => {
    const values: Record<string, string> = {}
    config.textElements.forEach((element) => {
      values[element.id] = userEditData.textValues[element.id] ?? element.defaultValue
    })
    return values
  }, [config.textElements, userEditData.textValues])

  // 폰트 두께 변환
  const getFontWeight = (weight: string): number => {
    const weightMap: Record<string, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    }
    return weightMap[weight] || 400
  }

  // textAlign과 verticalAlign에 따른 transform 값 계산
  const getTransformByAlign = (textAlign: string, verticalAlign: string = 'middle'): string => {
    let xTransform: string
    let yTransform: string

    switch (textAlign) {
      case 'left':
        xTransform = '0'
        break
      case 'right':
        xTransform = '-100%'
        break
      case 'center':
      default:
        xTransform = '-50%'
        break
    }

    switch (verticalAlign) {
      case 'top':
        yTransform = '0'
        break
      case 'bottom':
        yTransform = '-100%'
        break
      case 'middle':
      default:
        yTransform = '-50%'
        break
    }

    return `translate(${xTransform}, ${yTransform})`
  }

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // 내보내기 전용 캔버스 생성 및 캡처
  const captureCanvas = useCallback(
    async (format: ExportFormat): Promise<HTMLCanvasElement | null> => {
      // 폰트 로딩 대기
      await document.fonts.ready

      // 임시 컨테이너 생성 (화면 밖에 위치)
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.zIndex = '-1'
      document.body.appendChild(container)

      // 내보내기 전용 캔버스 (원본 크기, scale=1, 테두리 없음)
      const exportCanvas = document.createElement('div')
      exportCanvas.id = 'welcomeboard-canvas-export'
      exportCanvas.style.position = 'relative'
      exportCanvas.style.overflow = 'hidden'
      exportCanvas.style.width = `${template.width}px`
      exportCanvas.style.height = `${template.height}px`

      // 배경 이미지
      const bgImg = document.createElement('img')
      bgImg.src = getImageSrc(template.backgroundUrl)
      bgImg.crossOrigin = 'anonymous'
      bgImg.style.position = 'absolute'
      bgImg.style.inset = '0'
      bgImg.style.width = '100%'
      bgImg.style.height = '100%'
      bgImg.style.objectFit = 'cover'
      exportCanvas.appendChild(bgImg)

      // 텍스트 요소들
      config.textElements.forEach((element) => {
        const textDiv = document.createElement('div')
        textDiv.style.position = 'absolute'
        textDiv.style.left = `${element.x}%`
        textDiv.style.top = `${element.y}%`
        textDiv.style.transform = getTransformByAlign(element.textAlign, element.verticalAlign || 'middle')
        textDiv.style.width = element.width ? `${element.width}%` : 'auto'
        textDiv.style.fontSize = `${element.fontSize}px`
        textDiv.style.fontWeight = String(getFontWeight(element.fontWeight))
        textDiv.style.fontFamily = 'Pretendard, sans-serif'
        textDiv.style.color = element.color
        textDiv.style.textAlign = element.textAlign
        textDiv.style.whiteSpace = 'pre-wrap'
        textDiv.style.wordBreak = 'keep-all'
        textDiv.style.zIndex = '10'
        textDiv.textContent = textValues[element.id]
        exportCanvas.appendChild(textDiv)
      })

      // 로고 영역
      if (config.logoArea && userEditData.logoUrl) {
        const logoContainer = document.createElement('div')
        logoContainer.style.position = 'absolute'
        logoContainer.style.left = `${config.logoArea.x}%`
        logoContainer.style.top = `${config.logoArea.y}%`
        logoContainer.style.transform = 'translate(-50%, -50%)'
        logoContainer.style.width = `${config.logoArea.width}px`
        logoContainer.style.height = `${config.logoArea.height}px`
        logoContainer.style.display = 'flex'
        logoContainer.style.alignItems = 'center'
        logoContainer.style.justifyContent =
          (userEditData.logoAlign ?? 'center') === 'left'
            ? 'flex-start'
            : (userEditData.logoAlign ?? 'center') === 'right'
              ? 'flex-end'
              : 'center'
        logoContainer.style.zIndex = '10'

        const logoImg = document.createElement('img')
        logoImg.src = userEditData.logoUrl
        logoImg.crossOrigin = 'anonymous'
        logoImg.style.maxWidth = '100%'
        logoImg.style.maxHeight = '100%'
        logoImg.style.objectFit = 'contain'
        logoImg.style.objectPosition =
          (userEditData.logoAlign ?? 'center') === 'left'
            ? 'left'
            : (userEditData.logoAlign ?? 'center') === 'right'
              ? 'right'
              : 'center'
        logoContainer.appendChild(logoImg)
        exportCanvas.appendChild(logoContainer)
      }

      container.appendChild(exportCanvas)

      // 이미지 로딩 대기
      const images = container.querySelectorAll('img')
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve()
              } else {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              }
            })
        )
      )

      // 추가 대기 (렌더링 안정화)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // html2canvas 옵션
      const scale = highResolution ? 2 : 1
      const options: Parameters<typeof html2canvas>[1] = {
        useCORS: true,
        allowTaint: false,
        scale,
        backgroundColor: format === 'jpg' ? '#FFFFFF' : null,
        logging: false,
      }

      try {
        const canvas = await html2canvas(exportCanvas, options)
        return canvas
      } catch (error) {
        console.error('html2canvas error:', error)
        return null
      } finally {
        // 임시 컨테이너 제거
        document.body.removeChild(container)
      }
    },
    [template, config, textValues, userEditData.logoUrl, userEditData.logoAlign, highResolution]
  )

  // PNG 다운로드
  const downloadPNG = useCallback(async () => {
    setExporting('png')
    try {
      const canvas = await captureCanvas('png')
      if (!canvas) {
        throw new Error('캡처에 실패했습니다.')
      }

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = generateFileName(template.name, 'png')
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('PNG download error:', error)
      toast.error('PNG 다운로드 중 오류가 발생했습니다.')
    } finally {
      setExporting(null)
    }
  }, [captureCanvas, template.name])

  // JPG 다운로드
  const downloadJPG = useCallback(async () => {
    setExporting('jpg')
    try {
      const canvas = await captureCanvas('jpg')
      if (!canvas) {
        throw new Error('캡처에 실패했습니다.')
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const link = document.createElement('a')
      link.download = generateFileName(template.name, 'jpg')
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('JPG download error:', error)
      toast.error('JPG 다운로드 중 오류가 발생했습니다.')
    } finally {
      setExporting(null)
    }
  }, [captureCanvas, template.name])

  // PDF 다운로드
  const downloadPDF = useCallback(async () => {
    setExporting('pdf')
    try {
      const canvas = await captureCanvas('pdf')
      if (!canvas) {
        throw new Error('캡처에 실패했습니다.')
      }

      // PDF 방향 결정 (가로형 또는 세로형)
      const isLandscape = template.width > template.height
      const orientation = isLandscape ? 'l' : 'p'

      // 픽셀을 mm로 변환 (96 DPI 기준: 1px = 0.264583mm)
      const pxToMm = (px: number) => px * 0.264583
      const pdfWidth = pxToMm(template.width)
      const pdfHeight = pxToMm(template.height)

      // 설정된 크기에 맞는 커스텀 PDF 생성
      const pdf = new jsPDF(orientation, 'mm', [pdfWidth, pdfHeight])
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(generateFileName(template.name, 'pdf'))
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error('PDF 다운로드 중 오류가 발생했습니다.')
    } finally {
      setExporting(null)
    }
  }, [captureCanvas, template.name, template.width, template.height])

  const isExporting = exporting !== null

  return (
    <div className="space-y-4 border-t pt-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">내보내기</h3>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="high-resolution"
            checked={highResolution}
            onCheckedChange={(checked: boolean) => setHighResolution(checked)}
          />
          <Label htmlFor="high-resolution" className="text-xs">
            고해상도 (2x)
          </Label>
        </div>
      </div>

      {/* 다운로드 버튼 그룹 */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          // variant="outline"
          onClick={downloadPNG}
          disabled={isExporting}
          className="flex-col h-auto py-3"
        >
          {exporting === 'png' ? (
            <Loader2 className="h-6 w-6 animate-spin mb-1" />
          ) : ""}
          <span className="text-xs">PNG</span>
        </Button>

        <Button
          // variant="outline"
          onClick={downloadJPG}
          disabled={isExporting}
          className="flex-col h-auto py-3"
        >
          {exporting === 'jpg' ? (
            <Loader2 className="h-6 w-6 animate-spin mb-1" />
          ) : ""}
          <span className="text-xs">JPG</span>
        </Button>

        <Button
          // variant="outline"
          onClick={downloadPDF}
          disabled={isExporting}
          className="flex-col h-auto py-3"
        >
          {exporting === 'pdf' ? (
            <Loader2 className="h-6 w-6 animate-spin mb-1" />
          ) : ""}
          <span className="text-xs">PDF</span>
        </Button>
      </div>

      {/* 안내 */}
      <p className="text-xs text-muted-foreground">
        고해상도 옵션을 선택하면 2배 크기({template.width * 2} x {template.height * 2}px)로 내보내집니다.
      </p>
    </div>
  )
}

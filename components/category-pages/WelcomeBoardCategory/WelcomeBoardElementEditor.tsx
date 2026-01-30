'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  Type,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyCenter,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { TemplateConfig, TextElement, LogoArea } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardElementEditorProps {
  config: TemplateConfig
  width: number
  height: number
  backgroundUrl: string | null
  onAddTextElement: () => void
  onRemoveTextElement: (elementId: string) => void
  onUpdateTextElement: (elementId: string, updates: Partial<TextElement>) => void
  onUpdateLogoArea: (updates: Partial<LogoArea> | null) => void
}

export function WelcomeBoardElementEditor({
  config,
  width,
  height,
  backgroundUrl,
  onAddTextElement,
  onRemoveTextElement,
  onUpdateTextElement,
  onUpdateLogoArea,
}: WelcomeBoardElementEditorProps) {
  // 다중 선택 상태
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [elementStartPositions, setElementStartPositions] = useState<Record<string, { x: number; y: number }>>({})
  
  // 마퀴 선택 상태
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false)
  const [marqueeStart, setMarqueeStart] = useState({ x: 0, y: 0 })
  const [marqueeEnd, setMarqueeEnd] = useState({ x: 0, y: 0 })
  const [justFinishedMarquee, setJustFinishedMarquee] = useState(false)
  
  // 줌 상태
  const [zoom, setZoom] = useState(0.5) // 기본값을 50%로 (1920px의 50% = 960px)
  
  const previewRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // 색상 헥스 코드 유효성 검사
  const isValidHex = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string | null) => {
    if (!url) return ''
    if (url.startsWith('blob:')) return url
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // 폰트 두께를 CSS 값으로 변환
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

    // X축 (수평) 정렬
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

    // Y축 (수직) 정렬
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

  // 선택된 텍스트 요소들 가져오기
  const selectedTextElements = useMemo(() => {
    return config.textElements.filter((el) => selectedElementIds.includes(el.id))
  }, [config.textElements, selectedElementIds])

  // 로고가 선택되었는지 확인
  const isLogoSelected = selectedElementIds.includes('logo')

  // 공통 속성 계산 (다중 선택 시)
  const commonProperties = useMemo(() => {
    if (selectedTextElements.length === 0) return null
    if (selectedTextElements.length === 1) return selectedTextElements[0]

    const first = selectedTextElements[0]
    return {
      fontSize: selectedTextElements.every((el) => el.fontSize === first.fontSize) ? first.fontSize : null,
      fontWeight: selectedTextElements.every((el) => el.fontWeight === first.fontWeight) ? first.fontWeight : null,
      color: selectedTextElements.every((el) => el.color === first.color) ? first.color : null,
      textAlign: selectedTextElements.every((el) => el.textAlign === first.textAlign) ? first.textAlign : null,
    }
  }, [selectedTextElements])

  // 요소 선택 핸들러 (onClick용 - Shift 처리는 handleDragStart에서)
  const handleElementSelect = useCallback(
    (elementId: string, event: React.MouseEvent) => {
      event.stopPropagation()
      
      // Shift+클릭은 handleDragStart에서 처리하므로 여기서는 무시
      if (event.shiftKey) return
      
      // 일반 클릭: 단일 선택 (이미 선택된 요소가 아닌 경우)
      if (!selectedElementIds.includes(elementId)) {
        setSelectedElementIds([elementId])
      }
    },
    [selectedElementIds]
  )

  // 드래그 시작 (요소 이동)
  const handleDragStart = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation()
      if (!previewRef.current) return

      let currentSelection = selectedElementIds

      // Shift 키가 눌렸으면 다중 선택 토글
      if (e.shiftKey) {
        if (selectedElementIds.includes(elementId)) {
          // 이미 선택된 요소면 선택 해제
          currentSelection = selectedElementIds.filter((id) => id !== elementId)
        } else {
          // 선택되지 않은 요소면 추가
          currentSelection = [...selectedElementIds, elementId]
        }
        setSelectedElementIds(currentSelection)
        return // Shift+클릭은 드래그를 시작하지 않음
      }

      // 선택되지 않은 요소를 드래그하면 해당 요소만 선택
      if (!selectedElementIds.includes(elementId)) {
        currentSelection = [elementId]
        setSelectedElementIds(currentSelection)
      }

      const rect = previewRef.current.getBoundingClientRect()
      
      // 선택된 모든 요소의 시작 위치 저장
      const startPositions: Record<string, { x: number; y: number }> = {}
      currentSelection.forEach((id) => {
        if (id === 'logo' && config.logoArea) {
          startPositions[id] = { x: config.logoArea.x, y: config.logoArea.y }
        } else {
          const element = config.textElements.find((el) => el.id === id)
          if (element) {
            startPositions[id] = { x: element.x, y: element.y }
          }
        }
      })

      setElementStartPositions(startPositions)
      setDragStartPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    },
    [selectedElementIds, config.textElements, config.logoArea]
  )

  // 드래그 중 (요소 이동)
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewRef.current) return

      const rect = previewRef.current.getBoundingClientRect()
      const currentX = e.clientX - rect.left
      const currentY = e.clientY - rect.top

      const deltaXPercent = ((currentX - dragStartPos.x) / rect.width) * 100
      const deltaYPercent = ((currentY - dragStartPos.y) / rect.height) * 100

      // 선택된 모든 요소 이동
      Object.entries(elementStartPositions).forEach(([id, startPos]) => {
        const newX = Math.max(0, Math.min(100, startPos.x + deltaXPercent))
        const newY = Math.max(0, Math.min(100, startPos.y + deltaYPercent))

        if (id === 'logo') {
          onUpdateLogoArea({ x: Math.round(newX), y: Math.round(newY) })
        } else {
          onUpdateTextElement(id, { x: Math.round(newX), y: Math.round(newY) })
        }
      })
    },
    [isDragging, dragStartPos, elementStartPositions, onUpdateTextElement, onUpdateLogoArea]
  )

  // 마퀴 선택 시작
  const handleMarqueeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!previewRef.current) return
      
      // 요소 위에서 클릭했으면 마퀴 시작하지 않음
      const target = e.target as HTMLElement
      if (target.closest('[data-element-id]')) return

      const rect = previewRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setMarqueeStart({ x, y })
      setMarqueeEnd({ x, y })
      setIsMarqueeSelecting(true)

      // Shift 키가 눌리지 않았으면 기존 선택 해제
      if (!e.shiftKey) {
        setSelectedElementIds([])
      }
    },
    []
  )

  // 마퀴 선택 중
  const handleMarqueeMove = useCallback(
    (e: MouseEvent) => {
      if (!isMarqueeSelecting || !previewRef.current) return

      const rect = previewRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))

      setMarqueeEnd({ x, y })
    },
    [isMarqueeSelecting]
  )

  // 마퀴 선택 종료
  const handleMarqueeEnd = useCallback(() => {
    if (!isMarqueeSelecting || !previewRef.current) {
      setIsMarqueeSelecting(false)
      return
    }

    const rect = previewRef.current.getBoundingClientRect()
    
    // 마퀴 영역 계산 (퍼센트)
    const minX = (Math.min(marqueeStart.x, marqueeEnd.x) / rect.width) * 100
    const maxX = (Math.max(marqueeStart.x, marqueeEnd.x) / rect.width) * 100
    const minY = (Math.min(marqueeStart.y, marqueeEnd.y) / rect.height) * 100
    const maxY = (Math.max(marqueeStart.y, marqueeEnd.y) / rect.height) * 100

    // 마퀴 영역 내의 요소들 선택
    const elementsInMarquee: string[] = []

    config.textElements.forEach((element) => {
      if (element.x >= minX && element.x <= maxX && element.y >= minY && element.y <= maxY) {
        elementsInMarquee.push(element.id)
      }
    })

    if (config.logoArea) {
      if (
        config.logoArea.x >= minX &&
        config.logoArea.x <= maxX &&
        config.logoArea.y >= minY &&
        config.logoArea.y <= maxY
      ) {
        elementsInMarquee.push('logo')
      }
    }

    setSelectedElementIds((prev) => [...new Set([...prev, ...elementsInMarquee])])
    setIsMarqueeSelecting(false)
    
    // 마퀴 선택이 완료되었음을 표시 (handleBackgroundClick에서 선택 해제 방지)
    setJustFinishedMarquee(true)
    setTimeout(() => setJustFinishedMarquee(false), 0)
  }, [isMarqueeSelecting, marqueeStart, marqueeEnd, config.textElements, config.logoArea])

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setElementStartPositions({})
  }, [])

  // 빈 영역 클릭 시 선택 해제
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // 마퀴 선택 직후에는 선택 해제하지 않음
    if (justFinishedMarquee) return
    
    const target = e.target as HTMLElement
    if (!target.closest('[data-element-id]')) {
      setSelectedElementIds([])
    }
  }, [justFinishedMarquee])

  // 마우스 이벤트 리스너
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e)
      } else if (isMarqueeSelecting) {
        handleMarqueeMove(e)
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd()
      }
      if (isMarqueeSelecting) {
        handleMarqueeEnd()
      }
    }

    if (isDragging || isMarqueeSelecting) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isMarqueeSelecting, handleDragMove, handleMarqueeMove, handleDragEnd, handleMarqueeEnd])

  // 줌 핸들러 (10% ~ 100%)
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(1, prev + 0.1))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.1, prev - 0.1))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1) // 100% = 실제 크기 (예: 1920x1080)
  }, [])

  // 정렬 핸들러 - 위치 정렬 (여러 요소의 X/Y 좌표를 맞춤)
  const handleAlignLeft = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 좌측 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        // 로고의 x는 중심 좌표이므로, 좌측 끝에 맞추려면 너비의 절반만큼 이동
        const logoWidthPercent = (config.logoArea.width / width) * 100
        onUpdateLogoArea({ x: logoWidthPercent / 2 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { x: 0, textAlign: 'left' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (가장 왼쪽 요소에 맞춤)
    let minX = Infinity
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        minX = Math.min(minX, config.logoArea.x)
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) minX = Math.min(minX, element.x)
      }
    })

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ x: Math.round(minX) })
      } else {
        // 시각적 일관성을 위해 textAlign도 'left'로 설정
        onUpdateTextElement(id, { x: Math.round(minX), textAlign: 'left' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea, width])

  const handleAlignRight = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 우측 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        // 로고의 x는 중심 좌표이므로, 우측 끝에 맞추려면 100%에서 너비의 절반을 뺀 값
        const logoWidthPercent = (config.logoArea.width / width) * 100
        onUpdateLogoArea({ x: 100 - logoWidthPercent / 2 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { x: 100, textAlign: 'right' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (가장 오른쪽 요소에 맞춤)
    let maxX = -Infinity
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        maxX = Math.max(maxX, config.logoArea.x)
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) maxX = Math.max(maxX, element.x)
      }
    })

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ x: Math.round(maxX) })
      } else {
        // 시각적 일관성을 위해 textAlign도 'right'로 설정
        onUpdateTextElement(id, { x: Math.round(maxX), textAlign: 'right' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea, width])

  const handleAlignTop = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 상단 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        // 로고의 y는 중심 좌표이므로, 상단 끝에 맞추려면 높이의 절반만큼 이동
        const logoHeightPercent = (config.logoArea.height / height) * 100
        onUpdateLogoArea({ y: logoHeightPercent / 2 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { y: 0, verticalAlign: 'top' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (가장 위쪽 요소에 맞춤)
    let minY = Infinity
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        minY = Math.min(minY, config.logoArea.y)
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) minY = Math.min(minY, element.y)
      }
    })

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ y: Math.round(minY) })
      } else {
        // 시각적 일관성을 위해 verticalAlign도 'top'으로 설정
        onUpdateTextElement(id, { y: Math.round(minY), verticalAlign: 'top' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea, height])

  const handleAlignBottom = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 하단 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        // 로고의 y는 중심 좌표이므로, 하단 끝에 맞추려면 100%에서 높이의 절반을 뺀 값
        const logoHeightPercent = (config.logoArea.height / height) * 100
        onUpdateLogoArea({ y: 100 - logoHeightPercent / 2 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { y: 100, verticalAlign: 'bottom' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (가장 아래쪽 요소에 맞춤)
    let maxY = -Infinity
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        maxY = Math.max(maxY, config.logoArea.y)
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) maxY = Math.max(maxY, element.y)
      }
    })

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ y: Math.round(maxY) })
      } else {
        // 시각적 일관성을 위해 verticalAlign도 'bottom'으로 설정
        onUpdateTextElement(id, { y: Math.round(maxY), verticalAlign: 'bottom' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea, height])

  // 수평 중앙 정렬 (X 값을 평균으로)
  const handleAlignCenterHorizontal = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 수평 중앙 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        onUpdateLogoArea({ x: 50 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { x: 50, textAlign: 'center' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (평균 X 좌표로 정렬)
    let sumX = 0
    let count = 0
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        sumX += config.logoArea.x
        count++
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          sumX += element.x
          count++
        }
      }
    })

    const avgX = sumX / count

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ x: Math.round(avgX) })
      } else {
        // 시각적 일관성을 위해 textAlign도 'center'로 설정
        onUpdateTextElement(id, { x: Math.round(avgX), textAlign: 'center' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea])

  // 수직 중앙 정렬 (Y 값을 평균으로)
  const handleAlignCenterVertical = useCallback(() => {
    if (selectedElementIds.length < 1) return

    // 단일 요소 선택 시: 전체 영역 기준으로 수직 중앙 정렬
    if (selectedElementIds.length === 1) {
      const id = selectedElementIds[0]
      if (id === 'logo' && config.logoArea) {
        onUpdateLogoArea({ y: 50 })
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          onUpdateTextElement(id, { y: 50, verticalAlign: 'middle' })
        }
      }
      return
    }
    
    // 여러 요소 선택 시: 기존 로직 (평균 Y 좌표로 정렬)
    let sumY = 0
    let count = 0
    selectedElementIds.forEach((id) => {
      if (id === 'logo' && config.logoArea) {
        sumY += config.logoArea.y
        count++
      } else {
        const element = config.textElements.find((el) => el.id === id)
        if (element) {
          sumY += element.y
          count++
        }
      }
    })

    const avgY = sumY / count

    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea({ y: Math.round(avgY) })
      } else {
        // 시각적 일관성을 위해 verticalAlign도 'middle'로 설정
        onUpdateTextElement(id, { y: Math.round(avgY), verticalAlign: 'middle' })
      }
    })
  }, [selectedElementIds, config.textElements, config.logoArea, onUpdateTextElement, onUpdateLogoArea])

  // 공통 속성 변경 핸들러
  const handleBatchUpdateTextElements = useCallback(
    (updates: Partial<TextElement>) => {
      selectedTextElements.forEach((element) => {
        onUpdateTextElement(element.id, updates)
      })
    },
    [selectedTextElements, onUpdateTextElement]
  )

  // 선택된 요소 삭제
  const handleDeleteSelected = useCallback(() => {
    selectedElementIds.forEach((id) => {
      if (id === 'logo') {
        onUpdateLogoArea(null)
      } else {
        onRemoveTextElement(id)
      }
    })
    setSelectedElementIds([])
  }, [selectedElementIds, onRemoveTextElement, onUpdateLogoArea])

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* 좌측: 미리보기 영역 (나머지 전체) */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {/* 툴바 */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          {/* 줌 컨트롤 */}
          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>축소</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleZoomReset}>
                    {Math.round(zoom * 100)}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent>원본 크기</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>확대</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-2" />

              {/* 정렬 컨트롤 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignLeft}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignHorizontalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>좌측 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignCenterHorizontal}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignHorizontalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>수평 중앙 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignRight}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignHorizontalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>우측 정렬</TooltipContent>
              </Tooltip>

              <div className="w-px h-6 bg-border mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignTop}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignVerticalJustifyStart className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>상단 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignCenterVertical}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignVerticalJustifyCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>수직 중앙 정렬</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleAlignBottom}
                    disabled={selectedElementIds.length < 1}
                  >
                    <AlignVerticalJustifyEnd className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>하단 정렬</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* 선택 정보 */}
          <div className="text-sm text-muted-foreground">
            {selectedElementIds.length > 0 && (
              <span>{selectedElementIds.length}개 선택됨</span>
            )}
          </div>
        </div>

        {/* 미리보기 캔버스 */}
        <div 
          ref={previewContainerRef}
          className="flex-1 min-h-0 overflow-hidden p-4"
        >
          <div className="w-full h-full overflow-auto flex items-center justify-center">
            <div
              ref={previewRef}
              className="relative bg-muted rounded-lg overflow-hidden border shadow-lg select-none cursor-crosshair flex-shrink-0"
              style={{
                width: `${width * zoom}px`,
                height: `${height * zoom}px`,
                backgroundImage: backgroundUrl ? `url(${getImageSrc(backgroundUrl)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={handleBackgroundClick}
              onMouseDown={handleMarqueeStart}
            >
            {!backgroundUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                배경 이미지를 업로드하세요
              </div>
            )}

            {/* 텍스트 요소 */}
            {backgroundUrl &&
              config.textElements.map((element) => {
                const isSelected = selectedElementIds.includes(element.id)
                return (
                  <div
                    key={element.id}
                    data-element-id={element.id}
                    className={`absolute cursor-move transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-penta-blue shadow-lg'
                        : 'hover:ring-2 hover:ring-penta-blue/50'
                    }`}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      transform: getTransformByAlign(element.textAlign, element.verticalAlign || 'middle'),
                      fontSize: `${element.fontSize * zoom}px`,
                      fontWeight: getFontWeight(element.fontWeight),
                      fontFamily: 'Pretendard, sans-serif',
                      color: element.color,
                      textAlign: element.textAlign,
                      maxWidth: element.width ? `${element.width}%` : 'auto',
                      whiteSpace: 'nowrap',
                      padding: `${4 * zoom}px ${8 * zoom}px`,
                      borderRadius: '4px',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : 'transparent',
                    }}
                    onMouseDown={(e) => handleDragStart(e, element.id)}
                    onClick={(e) => handleElementSelect(element.id, e)}
                  >
                    {element.defaultValue}
                  </div>
                )
              })}

            {/* 로고 영역 */}
            {backgroundUrl && config.logoArea && (
              <div
                data-element-id="logo"
                className={`absolute border-2 border-dashed cursor-move transition-all ${
                  isLogoSelected
                    ? 'border-penta-blue bg-penta-blue/20 shadow-lg'
                    : 'border-gray-400 bg-white/30 hover:border-penta-blue/50'
                }`}
                style={{
                  left: `${config.logoArea.x}%`,
                  top: `${config.logoArea.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${config.logoArea.width * zoom}px`,
                  height: `${config.logoArea.height * zoom}px`,
                  minWidth: `${60 * zoom}px`,
                  minHeight: `${30 * zoom}px`,
                }}
                onMouseDown={(e) => handleDragStart(e, 'logo')}
                onClick={(e) => handleElementSelect('logo', e)}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 font-medium">
                  로고 영역
                </div>
              </div>
            )}

            {/* 마퀴 선택 영역 */}
            {isMarqueeSelecting && (
              <div
                className="absolute border-2 border-penta-blue bg-penta-blue/10 pointer-events-none"
                style={{
                  left: Math.min(marqueeStart.x, marqueeEnd.x),
                  top: Math.min(marqueeStart.y, marqueeEnd.y),
                  width: Math.abs(marqueeEnd.x - marqueeStart.x),
                  height: Math.abs(marqueeEnd.y - marqueeStart.y),
                }}
              />
            )}
          </div>
          </div>
        </div>
      </div>

      {/* 우측: 속성 편집 패널 (고정 너비) */}
      <div className="w-80 flex-shrink-0 border-l flex flex-col h-full bg-card overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">요소 속성</h3>
              <Button variant="outline" size="sm" onClick={onAddTextElement}>
                텍스트 추가
              </Button>
            </div>

            {/* 요소 목록 */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">요소 목록</Label>
              <div className="space-y-1 max-h-[180px] overflow-y-auto border rounded-md p-2">
                {config.textElements.map((element) => (
                  <div
                    key={element.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      selectedElementIds.includes(element.id)
                        ? 'bg-penta-blue/10 text-penta-blue'
                        : 'hover:bg-muted'
                    }`}
                    onClick={(e) => handleElementSelect(element.id, e)}
                  >
                    <Type className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{element.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveTextElement(element.id)
                        setSelectedElementIds((prev) => prev.filter((id) => id !== element.id))
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {config.logoArea && (
                  <div
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isLogoSelected
                        ? 'bg-penta-blue/10 text-penta-blue'
                        : 'hover:bg-muted'
                    }`}
                    onClick={(e) => handleElementSelect('logo', e)}
                  >
                    <ImageIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">로고 영역</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateLogoArea(null)
                        setSelectedElementIds((prev) => prev.filter((id) => id !== 'logo'))
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {!config.logoArea && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      onUpdateLogoArea({
                        x: 50,
                        y: 30,
                        width: 200,
                        height: 80,
                        placeholder: '방문사 로고',
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    로고 영역 추가
                  </Button>
                )}
              </div>
            </div>

            {/* 선택된 요소 속성 편집 - 단일 텍스트 요소 */}
            {selectedTextElements.length === 1 && !isLogoSelected && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-medium">텍스트 속성</Label>
                
                {/* 레이블 */}
                <div className="space-y-1">
                  <Label className="text-xs">레이블</Label>
                  <Input
                    value={selectedTextElements[0].label}
                    onChange={(e) =>
                      onUpdateTextElement(selectedTextElements[0].id, { label: e.target.value })
                    }
                    className="h-8 text-sm"
                    placeholder="요소 이름"
                  />
                </div>

                {/* 기본 텍스트 */}
                <div className="space-y-1">
                  <Label className="text-xs">기본 텍스트</Label>
                  <Input
                    value={selectedTextElements[0].defaultValue}
                    onChange={(e) =>
                      onUpdateTextElement(selectedTextElements[0].id, { defaultValue: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>

                {/* 위치 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">X 위치: {selectedTextElements[0].x}%</Label>
                    <Slider
                      value={[selectedTextElements[0].x]}
                      onValueChange={([value]) =>
                        onUpdateTextElement(selectedTextElements[0].id, { x: value })
                      }
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Y 위치: {selectedTextElements[0].y}%</Label>
                    <Slider
                      value={[selectedTextElements[0].y]}
                      onValueChange={([value]) =>
                        onUpdateTextElement(selectedTextElements[0].id, { y: value })
                      }
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* 폰트 크기 */}
                <div className="space-y-1">
                  <Label className="text-xs">폰트 크기: {selectedTextElements[0].fontSize}px</Label>
                  <Slider
                    value={[selectedTextElements[0].fontSize]}
                    onValueChange={([value]) =>
                      onUpdateTextElement(selectedTextElements[0].id, { fontSize: value })
                    }
                    min={8}
                    max={200}
                    step={1}
                  />
                </div>

                {/* 폰트 두께 */}
                <div className="space-y-1">
                  <Label className="text-xs">폰트 두께</Label>
                  <Select
                    value={selectedTextElements[0].fontWeight}
                    onValueChange={(value) =>
                      onUpdateTextElement(selectedTextElements[0].id, {
                        fontWeight: value as TextElement['fontWeight'],
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (400)</SelectItem>
                      <SelectItem value="medium">Medium (500)</SelectItem>
                      <SelectItem value="semibold">Semibold (600)</SelectItem>
                      <SelectItem value="bold">Bold (700)</SelectItem>
                      <SelectItem value="extrabold">ExtraBold (800)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 정렬 */}
                <div className="space-y-1">
                  <Label className="text-xs">정렬</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={selectedTextElements[0].textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() =>
                        onUpdateTextElement(selectedTextElements[0].id, { textAlign: 'left' })
                      }
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedTextElements[0].textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() =>
                        onUpdateTextElement(selectedTextElements[0].id, { textAlign: 'center' })
                      }
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedTextElements[0].textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() =>
                        onUpdateTextElement(selectedTextElements[0].id, { textAlign: 'right' })
                      }
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 색상 */}
                <div className="space-y-1">
                  <Label className="text-xs">색상</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={selectedTextElements[0].color}
                      onChange={(e) =>
                        onUpdateTextElement(selectedTextElements[0].id, { color: e.target.value })
                      }
                      className="h-8 w-12 p-0 border-0 cursor-pointer"
                    />
                    <Input
                      value={selectedTextElements[0].color}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.length < 7) {
                          onUpdateTextElement(selectedTextElements[0].id, { color: value })
                        }
                      }}
                      className="h-8 text-sm flex-1"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* 사용자 편집 가능 여부 */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id={`editable-${selectedTextElements[0].id}`}
                    checked={selectedTextElements[0].editable ?? true}
                    onCheckedChange={(checked) =>
                      onUpdateTextElement(selectedTextElements[0].id, {
                        editable: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor={`editable-${selectedTextElements[0].id}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    사용자 편집 가능
                  </Label>
                </div>

                {/* 삭제 버튼 */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onRemoveTextElement(selectedTextElements[0].id)
                    setSelectedElementIds([])
                  }}
                >
                  요소 삭제
                </Button>
              </div>
            )}

            {/* 다중 텍스트 요소 선택 시 공통 속성 편집 */}
            {selectedTextElements.length > 1 && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-medium">
                  공통 속성 ({selectedTextElements.length}개 선택)
                </Label>
                
                {/* 폰트 크기 */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    폰트 크기: {commonProperties?.fontSize !== null ? `${commonProperties?.fontSize}px` : '다양함'}
                  </Label>
                  <Slider
                    value={[commonProperties?.fontSize ?? 24]}
                    onValueChange={([value]) => handleBatchUpdateTextElements({ fontSize: value })}
                    min={8}
                    max={200}
                    step={1}
                  />
                </div>

                {/* 폰트 두께 */}
                <div className="space-y-1">
                  <Label className="text-xs">폰트 두께</Label>
                  <Select
                    value={commonProperties?.fontWeight ?? ''}
                    onValueChange={(value) =>
                      handleBatchUpdateTextElements({ fontWeight: value as TextElement['fontWeight'] })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="다양함" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (400)</SelectItem>
                      <SelectItem value="medium">Medium (500)</SelectItem>
                      <SelectItem value="semibold">Semibold (600)</SelectItem>
                      <SelectItem value="bold">Bold (700)</SelectItem>
                      <SelectItem value="extrabold">ExtraBold (800)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 정렬 */}
                <div className="space-y-1">
                  <Label className="text-xs">정렬</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={commonProperties?.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleBatchUpdateTextElements({ textAlign: 'left' })}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={commonProperties?.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleBatchUpdateTextElements({ textAlign: 'center' })}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={commonProperties?.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleBatchUpdateTextElements({ textAlign: 'right' })}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 색상 */}
                <div className="space-y-1">
                  <Label className="text-xs">색상</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={commonProperties?.color ?? '#000000'}
                      onChange={(e) => handleBatchUpdateTextElements({ color: e.target.value })}
                      className="h-8 w-12 p-0 border-0 cursor-pointer"
                    />
                    <Input
                      value={commonProperties?.color ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (isValidHex(value) || value.length < 7) {
                          handleBatchUpdateTextElements({ color: value })
                        }
                      }}
                      className="h-8 text-sm flex-1"
                      placeholder="다양함"
                    />
                  </div>
                </div>

                {/* 선택 삭제 */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteSelected}
                >
                  선택된 요소 삭제
                </Button>
              </div>
            )}

            {/* 로고 영역만 선택 */}
            {isLogoSelected && selectedTextElements.length === 0 && config.logoArea && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-medium">로고 영역 속성</Label>
                
                {/* 위치 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">X 위치: {config.logoArea.x}%</Label>
                    <Slider
                      value={[config.logoArea.x]}
                      onValueChange={([value]) => onUpdateLogoArea({ x: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Y 위치: {config.logoArea.y}%</Label>
                    <Slider
                      value={[config.logoArea.y]}
                      onValueChange={([value]) => onUpdateLogoArea({ y: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>

                {/* 크기 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">너비 (px)</Label>
                    <Input
                      type="number"
                      value={config.logoArea.width}
                      onChange={(e) => onUpdateLogoArea({ width: Number(e.target.value) })}
                      className="h-8 text-sm"
                      min={50}
                      max={500}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">높이 (px)</Label>
                    <Input
                      type="number"
                      value={config.logoArea.height}
                      onChange={(e) => onUpdateLogoArea({ height: Number(e.target.value) })}
                      className="h-8 text-sm"
                      min={50}
                      max={500}
                    />
                  </div>
                </div>

                {/* 플레이스홀더 */}
                <div className="space-y-1">
                  <Label className="text-xs">플레이스홀더 텍스트</Label>
                  <Input
                    value={config.logoArea.placeholder}
                    onChange={(e) => onUpdateLogoArea({ placeholder: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {/* 삭제 버튼 */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onUpdateLogoArea(null)
                    setSelectedElementIds([])
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  로고 영역 삭제
                </Button>
              </div>
            )}

            {/* 로고 + 텍스트 혼합 선택 시 공통 위치 속성만 */}
            {isLogoSelected && selectedTextElements.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-medium">
                  혼합 선택 ({selectedElementIds.length}개)
                </Label>
                <p className="text-xs text-muted-foreground">
                  텍스트와 로고가 함께 선택되었습니다. 위치 정렬은 상단 툴바를 사용하세요.
                </p>

                {/* 선택 삭제 */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  선택된 요소 삭제
                </Button>
              </div>
            )}

            {/* 선택 안내 */}
            {selectedElementIds.length === 0 && (
              <div className="pt-4 border-t text-center text-sm text-muted-foreground">
                <p>미리보기 영역에서 요소를 클릭하여 선택하세요.</p>
                <p className="mt-2 text-xs">
                  <strong>Shift+클릭</strong>: 다중 선택<br />
                  <strong>드래그</strong>: 영역 선택
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { forwardRef, useMemo } from 'react'
import Image from 'next/image'
import type { TemplateConfig, UserEditData, WelcomeBoardTemplate } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardCanvasProps {
  template: WelcomeBoardTemplate
  userEditData: UserEditData
  scale?: number
  showEditHighlight?: boolean
  activeElementId?: string | null
  onElementClick?: (elementId: string) => void
}

export const WelcomeBoardCanvas = forwardRef<HTMLDivElement, WelcomeBoardCanvasProps>(
  function WelcomeBoardCanvas(
    {
      template,
      userEditData,
      scale = 1,
      showEditHighlight = false,
      activeElementId,
      onElementClick,
    },
    ref
  ) {
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

    // Backblaze B2 URL인 경우 프록시를 통해 제공
    const getImageSrc = (url: string) => {
      if (!url) return ''
      if (url.startsWith('http') && url.includes('backblazeb2.com')) {
        return `/api/posts/images?url=${encodeURIComponent(url)}`
      }
      return url
    }

    return (
      <div
        ref={ref}
        id="welcomeboard-canvas"
        className="relative overflow-hidden"
        style={{
          width: template.width * scale,
          height: template.height * scale,
        }}
      >
        {/* 배경 이미지 레이어 (z-0) */}
        <div className="absolute inset-0 z-0">
          <Image
            src={getImageSrc(template.backgroundUrl)}
            alt="배경"
            fill
            sizes={`${template.width}px`}
            className="object-cover"
            priority
            crossOrigin="anonymous"
            unoptimized
          />
        </div>

        {/* 텍스트 요소 레이어 (z-10) */}
        {config.textElements.map((element) => {
          const isActive = activeElementId === element.id
          return (
            <div
              key={element.id}
              className={`absolute z-10 transition-all ${
                showEditHighlight
                  ? 'cursor-pointer hover:ring-2 hover:ring-penta-blue/50'
                  : ''
              } ${isActive ? 'ring-2 ring-penta-blue' : ''}`}
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                transform: getTransformByAlign(element.textAlign, element.verticalAlign || 'middle'),
                width: element.width ? `${element.width}%` : 'auto',
                fontSize: element.fontSize * scale,
                fontWeight: getFontWeight(element.fontWeight),
                fontFamily: 'Pretendard, sans-serif',
                color: element.color,
                textAlign: element.textAlign,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
              }}
              onClick={() => {
                if (showEditHighlight && onElementClick) {
                  onElementClick(element.id)
                }
              }}
            >
              {textValues[element.id]}
            </div>
          )
        })}

        {/* 로고 영역 레이어 (z-10) */}
        {config.logoArea && (
          <div
            className={`absolute z-10 flex items-center justify-center transition-all ${
              showEditHighlight && !userEditData.logoUrl
                ? 'border-2 border-dashed border-gray-400 bg-white/30 cursor-pointer hover:ring-2 hover:ring-penta-blue/50'
                : ''
            } ${activeElementId === 'logo' ? 'ring-2 ring-penta-blue' : ''}`}
            style={{
              left: `${config.logoArea.x}%`,
              top: `${config.logoArea.y}%`,
              transform: 'translate(-50%, -50%)',
              width: config.logoArea.width * scale,
              height: config.logoArea.height * scale,
            }}
            onClick={() => {
              if (showEditHighlight && onElementClick) {
                onElementClick('logo')
              }
            }}
          >
            {userEditData.logoUrl ? (
              <Image
                src={userEditData.logoUrl}
                alt="방문사 로고"
                fill
                sizes={`${config.logoArea.width}px`}
                className="object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              showEditHighlight && (
                <span className="text-gray-500 text-sm">
                  {config.logoArea.placeholder}
                </span>
              )
            )}
          </div>
        )}
      </div>
    )
  }
)

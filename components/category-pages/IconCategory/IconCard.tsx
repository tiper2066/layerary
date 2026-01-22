'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { changeAllSvgColors, changeSvgStrokeWidth } from '@/lib/svg-utils'

interface Post {
  id: string
  title: string
  fileUrl?: string | null
  thumbnailUrl?: string | null
}

interface IconCardProps {
  post: Post
  isSelected: boolean
  onClick: (postId: string) => void
  size?: number // 표시 크기 (16-56px)
  color?: string // 색상
  strokeWidth?: number // stroke-width
}

export function IconCard({
  post,
  isSelected,
  onClick,
  size = 56,
  color = '#000000',
  strokeWidth = 2,
}: IconCardProps) {
  const [imageError, setImageError] = useState(false)
  const [svgContent, setSvgContent] = useState<string | null>(null)

  // SVG 파일 로드 및 속성 적용
  const loadSvg = useCallback(async () => {
    if (!post.fileUrl || imageError) return

    try {
      const response = await fetch(post.fileUrl)
      if (!response.ok) throw new Error('Failed to load SVG')
      
      let svg = await response.text()
      const originalSvg = svg // 원본 보관
      
      // 표시 크기 계산 (16-56px 제한)
      const displaySize = Math.min(size, 56)
      
      // viewBox 추출 (원본에서 먼저 추출)
      const viewBoxMatch = originalSvg.match(/viewBox=["']([^"']+)["']/i)
      let viewBox = viewBoxMatch ? viewBoxMatch[1] : null
      
      // viewBox가 없으면 원본 width/height에서 생성
      if (!viewBox) {
        const widthMatch = originalSvg.match(/width=["']([^"']+)["']/i)
        const heightMatch = originalSvg.match(/height=["']([^"']+)["']/i)
        if (widthMatch && heightMatch) {
          const w = parseFloat(widthMatch[1].replace(/px$/, ''))
          const h = parseFloat(heightMatch[1].replace(/px$/, ''))
          if (!isNaN(w) && !isNaN(h)) {
            viewBox = `0 0 ${w} ${h}`
          }
        }
      }
      
      // 1. 색상 변경 (fill="none" 유지)
      svg = changeAllSvgColors(svg, color)
      
      // 2. stroke-width 변경
      svg = changeSvgStrokeWidth(svg, strokeWidth)
      
      // 3. 모든 stroke 요소에 fill="none" 명시적 추가 (없는 경우만)
      svg = svg.replace(
        /<(rect|circle|ellipse|line|polyline|polygon|path|g)([^>]*?)>/gi,
        (match, tagName, attrs) => {
          // stroke가 있고 fill이 없으면 fill="none" 추가
          if (/stroke=/i.test(attrs) && !/fill=/i.test(attrs)) {
            attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + 'fill="none"'
          }
          return `<${tagName}${attrs ? ' ' + attrs : ''}>`
        }
      )
      
      // 4. 크기 조절: SVG 태그의 width/height만 제거 (rect 등의 width/height는 유지)
      svg = svg.replace(
        /<svg([^>]*?)>/i,
        (match, attrs) => {
          // SVG 태그의 width, height만 제거 (다른 요소는 건드리지 않음)
          let newAttrs = attrs.replace(/\s+width=["'][^"']*["']/gi, '')
          newAttrs = newAttrs.replace(/\s+height=["'][^"']*["']/gi, '')
          newAttrs = newAttrs.replace(/\s+viewBox=["'][^"']*["']/gi, '')
          newAttrs = newAttrs.replace(/\s+style=["'][^"']*["']/gi, '')
          newAttrs = newAttrs.trim()
          
          // viewBox 추가 (필수)
          if (viewBox) {
            newAttrs += ` viewBox="${viewBox}"`
          }
          
          // CSS 변수 활용 및 스타일 추가
          newAttrs += ` style="width: 100%; height: 100%; display: block; --icon-color: ${color};"`
          
          return `<svg${newAttrs ? ' ' + newAttrs : ''}>`
        }
      )
    
    setSvgContent(svg)
    } catch (error) {
      console.error('SVG load error:', error)
      setImageError(true)
    }
  }, [post.fileUrl, color, strokeWidth, size, imageError])

  // 속성 변경 시 SVG 다시 로드
  useEffect(() => {
    loadSvg()
  }, [loadSvg])

  // 파일명 추출 (확장자 제거)
  const fileName = post.title || post.fileUrl?.split('/').pop()?.replace(/\.svg$/i, '') || 'icon'

  // 흰색 선택 여부 확인
  const isWhiteSelected = color === '#FFFFFF' || color === '#FFF' || color?.toLowerCase() === 'white'
  const cardBackgroundColor = isWhiteSelected ? 'bg-black' : 'bg-card'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              relative cursor-pointer
              ${cardBackgroundColor} border rounded-lg overflow-hidden
              transition-all duration-200
              ${isSelected ? 'border-penta-blue dark:border-penta-sky ring-1 ring-penta-blue dark:ring-penta-sky' : 'hover:shadow-md'}
              flex items-center justify-center
            `}
            style={{
              width: '56px',
              height: '56px',
            }}
            onClick={() => onClick(post.id)}
          >
            {svgContent ? (
              <div
                className="icon-svg-container"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{
                  width: `${Math.min(size, 56)}px`,
                  height: `${Math.min(size, 56)}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: color, // currentColor 지원
                }}
              />
            ) : imageError ? (
              <div className="text-muted-foreground text-xs">Error</div>
            ) : (
              <div className={`animate-pulse w-full h-full ${isWhiteSelected ? 'bg-black/20' : 'bg-muted'}`} />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fileName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

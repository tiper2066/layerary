'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, RotateCcw } from 'lucide-react'

interface Post {
  id: string
  title: string
  concept?: string | null // CI/BI 타입
  images?: Array<{ url: string; thumbnailUrl?: string; name: string; order: number }> | null | any
}

interface PropertyPanelProps {
  post: Post | null
  selectedColor: string
  onColorChange: (color: string) => void
  onSizeChange: (width?: number, height?: number) => void
  onDownload: (format: 'png' | 'jpg' | 'svg') => void
}

const CI_COLORS = [
  { value: 'CI_COLOR_SET', label: 'CI 컬러 세트 (Blue + Gray)' },
  { value: '#000000', label: 'Black (#000000)' },
  { value: '#FFFFFF', label: 'White (#FFFFFF)' },
]

const BI_COLORS = [
  { value: '#000000', label: 'Black (#000000)' },
  { value: '#FFFFFF', label: 'White (#FFFFFF)' },
]

const SIZE_PRESETS = [
  { label: '60px', height: 60 },
  { label: '120px', height: 120 },
  { label: '240px', height: 240 },
  { label: '512px', height: 512 },
  { label: '1024px', height: 1024 },
]

export function PropertyPanel({
  post,
  selectedColor,
  onColorChange,
  onSizeChange,
  onDownload,
}: PropertyPanelProps) {
  const [width, setWidth] = useState<number | undefined>(undefined)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'svg'>('png')
  const [originalWidth, setOriginalWidth] = useState<number | undefined>(undefined)
  const [originalHeight, setOriginalHeight] = useState<number | undefined>(undefined)
  const [isSizeFieldFocused, setIsSizeFieldFocused] = useState(false)


  const postType = post?.concept || 'CI' // 기본값 CI
  const availableColors = postType === 'CI' ? CI_COLORS : BI_COLORS

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string) => {
    if (!url || url === '/placeholder.png') {
      return '/placeholder.png'
    }
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // 흰색 선택 여부 확인
  const isWhiteSelected = selectedColor === '#FFFFFF' || selectedColor === '#FFF' || selectedColor?.toLowerCase() === 'white'

  // 흰색으로 변경되고 JPG가 선택되어 있으면 PNG로 변경
  useEffect(() => {
    if (isWhiteSelected && downloadFormat === 'jpg') {
      setDownloadFormat('png')
    }
  }, [isWhiteSelected, downloadFormat])

  // SVG 포맷 선택 시 원본 크기로 되돌리기
  useEffect(() => {
    if (downloadFormat === 'svg' && originalWidth !== undefined && originalHeight !== undefined) {
      setWidth(originalWidth)
      setHeight(originalHeight)
      onSizeChange(originalWidth, originalHeight)
    }
  }, [downloadFormat, originalWidth, originalHeight])

  // post가 변경될 때 width, height 초기화
  useEffect(() => {
    if (post) {
      setWidth(undefined)
      setHeight(undefined)
    }
  }, [post?.id])

  // 이미지 정보 추출 (비율 계산용)
  useEffect(() => {
    if (!post?.images) {
      setAspectRatio(null)
      setWidth(undefined)
      setHeight(undefined)
      return
    }

    let images: Array<{ url: string; thumbnailUrl?: string; name: string; order: number }> = []
    if (Array.isArray(post.images)) {
      images = post.images
    } else if (typeof post.images === 'string') {
      try {
        images = JSON.parse(post.images)
      } catch {
        images = []
      }
    }

    if (images.length > 0) {
      const firstImage = images[0]
      const rawImageUrl = firstImage.thumbnailUrl || firstImage.url
      const imageUrl = getImageSrc(rawImageUrl)

      // 이미지 로드하여 비율 계산
      const img = new Image()
      img.onload = () => {
        const ratio = img.width / img.height
        setAspectRatio(ratio)
        // 원본 크기 저장
        setOriginalWidth(img.width)
        setOriginalHeight(img.height)
        // 초기 크기를 원본 이미지 크기로 설정 (다운로드 시 기본 크기)
        setWidth(img.width)
        setHeight(img.height)
        // 부모 컴포넌트에 초기 크기 전달
        onSizeChange(img.width, img.height)
      }
      img.onerror = (error) => {
        console.error('[PropertyPanel] 이미지 로드 실패:', error, imageUrl)
        setAspectRatio(null)
      }
      img.src = imageUrl
    }
  }, [post?.images])

  // 너비 변경 시 높이 자동 조정 (정비율)
  const handleWidthChange = (value: string) => {
    const numValue = value.trim()
    
    if (!numValue) {
      // 빈 값이면 가로만 undefined로 설정
      setWidth(undefined)
      onSizeChange(undefined, height)
      return
    }

    const newWidth = parseFloat(numValue)
    if (isNaN(newWidth) || newWidth <= 0) {
      return
    }

    setWidth(newWidth)
    
    // aspectRatio가 있으면 높이 자동 계산
    if (aspectRatio) {
      const newHeight = newWidth / aspectRatio
      setHeight(newHeight)
      onSizeChange(newWidth, newHeight)
    } else {
      // aspectRatio가 없으면 가로만 설정
      onSizeChange(newWidth, height)
    }
  }

  // 높이 변경 시 너비 자동 조정 (정비율)
  const handleHeightChange = (value: string) => {
    const numValue = value.trim()
    
    if (!numValue) {
      // 빈 값이면 세로만 undefined로 설정
      setHeight(undefined)
      onSizeChange(width, undefined)
      return
    }

    const newHeight = parseFloat(numValue)
    if (isNaN(newHeight) || newHeight <= 0) {
      return
    }

    setHeight(newHeight)
    
    // aspectRatio가 있으면 너비 자동 계산
    if (aspectRatio) {
      const newWidth = newHeight * aspectRatio
      setWidth(newWidth)
      onSizeChange(newWidth, newHeight)
    } else {
      // aspectRatio가 없으면 세로만 설정
      onSizeChange(width, newHeight)
    }
  }

  // 프리셋 높이 선택
  const handlePresetClick = (presetHeight: number) => {
    // 항상 높이 설정
    setHeight(presetHeight)
    
    if (aspectRatio) {
      // aspectRatio가 있으면 가로도 계산하여 설정
      const presetWidth = presetHeight * aspectRatio
      setWidth(presetWidth)
      onSizeChange(presetWidth, presetHeight)
    } else {
      // aspectRatio가 없으면 높이만 설정
      setWidth(undefined)
      onSizeChange(undefined, presetHeight)
    }
  }

  // 원본 크기로 초기화
  const handleResetSize = () => {
    if (originalWidth !== undefined && originalHeight !== undefined) {
      setWidth(originalWidth)
      setHeight(originalHeight)
      onSizeChange(originalWidth, originalHeight)
    }
  }

  if (!post) {
    return (
      <div className="w-[410px] h-full bg-background fixed right-0 top-0 bottom-0 flex items-center justify-center">
        <p className="text-muted-foreground">게시물을 선택하세요</p>
      </div>
    )
  }

  return (
    <div className="w-[410px] h-full bg-background fixed right-0 top-0 bottom-0 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* 제목 및 타입 */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{post.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">타입:</span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
              {postType}
            </span>
          </div>
        </div>

        {/* 색상 선택 */}
        <div className="space-y-3">
          <Label>색상</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableColors.map((color) => {
              // CI 컬러 세트인 경우 특별한 표시 (블루 + 그레이 두 개의 색상 표시)
              if (color.value === 'CI_COLOR_SET') {
                return (
                  <Button
                    key={color.value}
                    variant={selectedColor === color.value ? 'default' : 'outline'}
                    className="flex items-center gap-2 justify-start h-auto py-3 px-4"
                    onClick={() => onColorChange(color.value)}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-6 rounded border border-border"
                        style={{ backgroundColor: '#0060A9' }}
                      />
                      <div
                        className="w-4 h-6 rounded border border-border"
                        style={{ backgroundColor: '#999B9E' }}
                      />
                    </div>
                    <span className="text-sm">{color.label}</span>
                  </Button>
                )
              }
              
              // 일반 색상 버튼
              return (
                <Button
                  key={color.value}
                  variant={selectedColor === color.value ? 'default' : 'outline'}
                  className="flex items-center gap-2 justify-start h-auto py-3 px-4"
                  onClick={() => onColorChange(color.value)}
                >
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-sm">{color.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* 사이즈 조정 */}
        <div className="space-y-3">
          <Label>사이즈</Label>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="width" className="text-xs text-muted-foreground">
                가로 (px)
              </Label>
              <Input
                id="width"
                type="number"
                value={width !== undefined ? Math.round(width).toString() : ''}
                onChange={(e) => {
                  handleWidthChange(e.target.value)
                }}
                onFocus={() => {
                  setIsSizeFieldFocused(true)
                }}
                onBlur={() => {
                  setIsSizeFieldFocused(false)
                }}
                placeholder="자동"
                style={{
                  backgroundColor: isSizeFieldFocused ? '#D7EDFF80' : undefined,
                }}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label htmlFor="height" className="text-xs text-muted-foreground">
                세로 (px)
              </Label>
              <Input
                id="height"
                type="number"
                value={height !== undefined ? Math.round(height).toString() : ''}
                onChange={(e) => {
                  handleHeightChange(e.target.value)
                }}
                onFocus={() => {
                  setIsSizeFieldFocused(true)
                }}
                onBlur={() => {
                  setIsSizeFieldFocused(false)
                }}
                placeholder="자동"
                style={{
                  backgroundColor: isSizeFieldFocused ? '#D7EDFF80' : undefined,
                }}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label className="text-xs text-muted-foreground opacity-0">
                초기화
              </Label>
              <Button
                variant="outline"
                size="icon"
                onClick={handleResetSize}
                disabled={originalWidth === undefined || originalHeight === undefined}
                className="w-full h-10"
                title="원본 크기로 초기화"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 프리셋 버튼 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">프리셋</Label>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handlePresetClick(preset.height)
                  }}
                  className={height === preset.height ? 'bg-primary text-primary-foreground' : ''}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 다운로드 */}
        <div className="space-y-3 pt-4 border-t">
          <Label>다운로드</Label>
          <div className="space-y-2">
            <Select
              value={downloadFormat}
              onValueChange={(value) => {
                setDownloadFormat(value as 'png' | 'jpg' | 'svg')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="포맷 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                {!isWhiteSelected && <SelectItem value="jpg">JPG</SelectItem>}
                <SelectItem value="svg">SVG</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => {
                onDownload(downloadFormat)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

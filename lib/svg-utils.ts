/**
 * SVG 유틸리티 함수
 */

/**
 * SVG 문자열에서 색상을 변경합니다.
 * fill, stroke 속성의 색상을 변경합니다.
 * 
 * @param svgContent SVG 문자열
 * @param colorMap 색상 매핑 객체 { oldColor: newColor }
 * @returns 색상이 변경된 SVG 문자열
 */
export function changeSvgColors(
  svgContent: string,
  colorMap: Record<string, string>
): string {
  let modifiedSvg = svgContent

  // 각 색상 매핑에 대해 replace 수행
  Object.entries(colorMap).forEach(([oldColor, newColor]) => {
    // 정규식으로 색상 속성 값 변경
    // fill="oldColor", fill='oldColor', fill: oldColor 등 모든 경우 처리
    const patterns = [
      new RegExp(`fill=["']${escapeRegExp(oldColor)}["']`, 'gi'),
      new RegExp(`stroke=["']${escapeRegExp(oldColor)}["']`, 'gi'),
      new RegExp(`fill:\\s*${escapeRegExp(oldColor)}(?:\\s|;|$)`, 'gi'),
      new RegExp(`stroke:\\s*${escapeRegExp(oldColor)}(?:\\s|;|$)`, 'gi'),
      // 인라인 스타일 속성 내부의 색상도 변경
      new RegExp(`(fill|stroke)(:\\s*)${escapeRegExp(oldColor)}(?=[;"'\\s])`, 'gi'),
    ]

    patterns.forEach((pattern) => {
      modifiedSvg = modifiedSvg.replace(pattern, (match) => {
        // fill="color" -> fill="newColor" 형태로 변경
        if (match.includes('=')) {
          return match.replace(oldColor, newColor)
        }
        // fill: color -> fill: newColor 형태로 변경
        if (match.includes(':')) {
          return match.replace(oldColor, newColor)
        }
        return match
      })
    })

    // 일반적인 색상 값도 변경 (속성 없이 사용된 경우)
    // 주의: 이 부분은 너무 광범위하게 매칭될 수 있으므로 신중하게 사용
    const generalPattern = new RegExp(`\\b${escapeRegExp(oldColor)}\\b`, 'g')
    // SVG 내용 전체에서 속성 값으로 사용된 경우만 변경
    modifiedSvg = modifiedSvg.replace(
      new RegExp(`(?:fill|stroke)["']?:?\\s*${escapeRegExp(oldColor)}`, 'gi'),
      (match) => match.replace(oldColor, newColor)
    )
  })

  return modifiedSvg
}

/**
 * SVG에서 특정 색상을 다른 색상으로 변경합니다.
 * 
 * @param svgContent SVG 문자열
 * @param oldColor 변경할 색상 (hex, rgb, named color 등)
 * @param newColor 새로운 색상 (hex, rgb, named color 등)
 * @returns 색상이 변경된 SVG 문자열
 */
export function changeSvgColor(
  svgContent: string,
  oldColor: string | string[],
  newColor: string
): string {
  if (Array.isArray(oldColor)) {
    // 여러 색상을 한 번에 변경
    const colorMap: Record<string, string> = {}
    oldColor.forEach((color) => {
      colorMap[color] = newColor
    })
    return changeSvgColors(svgContent, colorMap)
  }

  return changeSvgColors(svgContent, { [oldColor]: newColor })
}

/**
 * SVG의 크기를 변경합니다.
 * 
 * @param svgContent SVG 문자열
 * @param width 너비 (px 또는 숫자)
 * @param height 높이 (px 또는 숫자)
 * @param maintainAspectRatio 정비율 유지 여부
 * @returns 크기가 변경된 SVG 문자열
 */
export function resizeSvg(
  svgContent: string,
  width?: number | string,
  height?: number | string,
  maintainAspectRatio: boolean = true
): string {
  let modifiedSvg = svgContent

  // SVG 태그의 width와 height 속성만 제거 (rect 등의 width/height는 유지, viewBox는 유지)
  modifiedSvg = modifiedSvg.replace(
    /<svg([^>]*?)>/i,
    (match, attrs) => {
      // SVG 태그의 width, height만 제거 (viewBox는 유지)
      let newAttrs = attrs.replace(/\s+width=["'][^"']*["']/gi, '')
      newAttrs = newAttrs.replace(/\s+height=["'][^"']*["']/gi, '')
      return `<svg${newAttrs ? ' ' + newAttrs : ''}>`
    }
  )

  // width 속성 추가
  if (width !== undefined) {
    const widthValue = typeof width === 'number' ? `${width}px` : width
    modifiedSvg = modifiedSvg.replace(
      /<svg([^>]*?)>/i,
      (match, attrs) => {
        const trimmedAttrs = attrs.trim()
        const separator = trimmedAttrs ? ' ' : ''
        return `<svg${separator}${trimmedAttrs} width="${widthValue}">`
      }
    )
  }

  // height 속성 추가
  if (height !== undefined) {
    const heightValue = typeof height === 'number' ? `${height}px` : height
    modifiedSvg = modifiedSvg.replace(
      /<svg([^>]*?)>/i,
      (match, attrs) => {
        const trimmedAttrs = attrs.trim()
        const separator = trimmedAttrs ? ' ' : ''
        return `<svg${separator}${trimmedAttrs} height="${heightValue}">`
      }
    )
  }

  // viewBox가 없으면 추가 (기본값)
  if (!modifiedSvg.match(/viewBox=["'][^"']*["']/i)) {
    modifiedSvg = modifiedSvg.replace(
      /<svg([^>]*?)>/i,
      (match, attrs) => {
        if (!attrs.includes('viewBox')) {
          // width와 height에서 값 추출
          const widthMatch = match.match(/width=["']([^"']*)["']/i)
          const heightMatch = match.match(/height=["']([^"']*)["']/i)
          
          if (widthMatch && heightMatch) {
            const w = widthMatch[1].replace(/px$/, '')
            const h = heightMatch[1].replace(/px$/, '')
            return `<svg${attrs} viewBox="0 0 ${w} ${h}">`
          }
        }
        return match
      }
    )
  }

  return modifiedSvg
}

/**
 * SVG에서 "Penta" 텍스트 요소의 색상을 변경하고, 나머지 텍스트는 다른 색상으로 변경합니다.
 * 일러스트레이터와 피그마에서 export한 SVG 모두 지원
 * 
 * @param svgContent SVG 문자열
 * @param pentaColor "Penta" 텍스트에 적용할 색상
 * @param otherColor 나머지 텍스트에 적용할 색상
 * @returns 색상이 변경된 SVG 문자열
 */
export function changeCiColorSet(
  svgContent: string,
  pentaColor: string,
  otherColor: string
): string {
  let modifiedSvg = svgContent
  
  // CI 색상 정의 (대소문자 무관)
  const ciBlueColors = ['#0060A9', '#0060a9']
  const ciGrayColors = ['#999B9E', '#999b9e']
  
  // 1단계: 텍스트 기반 요소 처리 (<text>, <tspan>)
  // 패턴 1: <tag>...Penta...</tag> 형태 (직접 포함)
  modifiedSvg = modifiedSvg.replace(
    /<((?:text|tspan))([^>]*?)>([^<]*?Penta[^<]*?)<\/\1>/gi,
    (match, tagName, attrs, content) => {
      // fill 속성 변경 또는 추가
      if (attrs.includes('fill=')) {
        attrs = attrs.replace(/fill=["'][^"']*["']/i, `fill="${pentaColor}"`)
      } else {
        attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + `fill="${pentaColor}"`
      }
      return `<${tagName}${attrs}>${content}</${tagName}>`
    }
  )
  
  // 패턴 2: 중첩 구조 (<text>...<tspan>Penta</tspan>...</text>)
  modifiedSvg = modifiedSvg.replace(
    /<text([^>]*)>([\s\S]*?)<\/text>/gi,
    (match, textAttrs, innerHtml) => {
      if (!/Penta/gi.test(innerHtml)) {
        return match
      }
      
      // 내부 tspan 중 "Penta"가 포함된 것만 변경
      innerHtml = innerHtml.replace(
        /<tspan([^>]*)>([\s\S]*?Penta[\s\S]*?)<\/tspan>/gi,
        (tspanMatch: string, tspanAttrs: string, tspanContent: string) => {
          if (tspanAttrs.includes('fill=')) {
            tspanAttrs = tspanAttrs.replace(/fill=["'][^"']*["']/i, `fill="${pentaColor}"`)
          } else {
            tspanAttrs = tspanAttrs.trim() + (tspanAttrs.trim() ? ' ' : '') + `fill="${pentaColor}"`
          }
          return `<tspan${tspanAttrs}>${tspanContent}</tspan>`
        }
      )
      
      return `<text${textAttrs}>${innerHtml}</text>`
    }
  )
  
  // 2단계: Path 요소 기반 처리 (일러스트레이터/피그마에서 Convert To Outlines로 export한 경우)
  // CI Blue 색상을 가진 path 요소는 pentaColor로 변경
  ciBlueColors.forEach(blueColor => {
    const escapedColor = escapeRegExp(blueColor)
    modifiedSvg = modifiedSvg.replace(
      new RegExp(`fill=["']${escapedColor}["']`, 'gi'),
      `fill="${pentaColor}"`
    )
  })
  
  // CI Gray 색상을 가진 path 요소는 otherColor로 변경
  ciGrayColors.forEach(grayColor => {
    const escapedColor = escapeRegExp(grayColor)
    modifiedSvg = modifiedSvg.replace(
      new RegExp(`fill=["']${escapedColor}["']`, 'gi'),
      `fill="${otherColor}"`
    )
  })
  
  // 3단계: 나머지 모든 fill 속성을 otherColor로 변경
  // offset을 사용하여 컨텍스트 확인
  const fillRegex = /fill=["']([^"']+)["']/gi
  let lastIndex = 0
  let result = ''
  
  let match
  while ((match = fillRegex.exec(modifiedSvg)) !== null) {
    const fillValue = match[1]
    
    // 이미 처리된 색상이면 그대로 유지
    if (fillValue === pentaColor || fillValue === otherColor) {
      result += modifiedSvg.substring(lastIndex, match.index) + match[0]
      lastIndex = match.index + match[0].length
      continue
    }
    
    // CI 색상이면 건너뛰기 (이미 처리됨)
    if (ciBlueColors.includes(fillValue) || ciGrayColors.includes(fillValue)) {
      result += modifiedSvg.substring(lastIndex, match.index) + match[0]
      lastIndex = match.index + match[0].length
      continue
    }
    
    // 주변 컨텍스트 확인 (앞뒤 300자)
    const contextStart = Math.max(0, match.index - 300)
    const contextEnd = Math.min(modifiedSvg.length, match.index + match[0].length + 300)
    const context = modifiedSvg.substring(contextStart, contextEnd)
    
    // "Penta"가 있고 pentaColor fill이 근처에 있으면 이미 처리된 것으로 간주
    if (/Penta/gi.test(context)) {
      const pentaFillInContext = new RegExp(`fill=["']${escapeRegExp(pentaColor)}["']`, 'i').test(context)
      if (pentaFillInContext) {
        result += modifiedSvg.substring(lastIndex, match.index) + match[0]
        lastIndex = match.index + match[0].length
        continue
      }
    }
    
    // 나머지는 otherColor로 변경
    result += modifiedSvg.substring(lastIndex, match.index) + `fill="${otherColor}"`
    lastIndex = match.index + match[0].length
  }
  
  result += modifiedSvg.substring(lastIndex)
  
  return result
}

/**
 * SVG의 모든 fill과 stroke 색상을 하나의 색상으로 변경합니다.
 * fill="none"인 경우는 유지하고, stroke만 있는 요소에 fill="none"을 명시적으로 추가합니다.
 * 
 * @param svgContent SVG 문자열
 * @param color 변경할 색상
 * @returns 색상이 변경된 SVG 문자열
 */
export function changeAllSvgColors(
  svgContent: string,
  color: string
): string {
  let modifiedSvg = svgContent
  
  // 1. 모든 fill 속성 변경 (fill="none"과 fill="url(...)" 제외)
  // 먼저 전체 SVG에서 fill 속성을 찾아서 변경
  modifiedSvg = modifiedSvg.replace(
    /fill=["']([^"']+)["']/gi,
    (match, fillValue) => {
      // fill="none" 또는 fill="url(...)" 인 경우 그대로 유지
      if (fillValue === 'none' || fillValue.startsWith('url(')) {
        return match
      }
      // 그 외의 모든 fill 색상 변경
      return `fill="${color}"`
    }
  )
  
  // 2. 모든 stroke 속성 변경 (stroke="none"과 stroke="url(...)" 제외)
  modifiedSvg = modifiedSvg.replace(
    /stroke=["']([^"']+)["']/gi,
    (match, strokeValue) => {
      // stroke="none" 또는 stroke="url(...)" 인 경우 그대로 유지
      if (strokeValue === 'none' || strokeValue.startsWith('url(')) {
        return match
      }
      // 그 외의 모든 stroke 색상 변경
      return `stroke="${color}"`
    }
  )
  
  // 3. CSS 클래스 내부의 fill과 stroke 색상 변경 (<style> 태그)
  modifiedSvg = modifiedSvg.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (match, styleContent) => {
      let newStyleContent = styleContent
      
      // fill 색상 변경
      newStyleContent = newStyleContent.replace(
        /fill:\s*([^;'"\s}]+)/gi,
        (styleMatch, fillValue) => {
          if (fillValue === 'none' || fillValue.startsWith('url(')) {
            return styleMatch
          }
          return `fill: ${color}`
        }
      )
      
      // stroke 색상 변경
      newStyleContent = newStyleContent.replace(
        /stroke:\s*([^;'"\s}]+)/gi,
        (styleMatch, strokeValue) => {
          if (strokeValue === 'none' || strokeValue.startsWith('url(')) {
            return styleMatch
          }
          return `stroke: ${color}`
        }
      )
      
      return match.replace(styleContent, newStyleContent)
    }
  )
  
  // 4. fill 속성이 없고 stroke도 없는 요소에 fill 속성 추가 (면으로 구성된 요소)
  // rect, circle, ellipse, polygon, path 등 면을 가질 수 있는 요소들
  modifiedSvg = modifiedSvg.replace(
    /<(rect|circle|ellipse|polygon|path)([^>]*?)(\/?)>/gi,
    (match, tagName, attrs, selfClose) => {
      const hasFill = /fill=/i.test(attrs)
      const hasStroke = /stroke=/i.test(attrs)
      
      // fill과 stroke가 모두 없으면 fill 속성 추가 (면으로 구성된 요소)
      if (!hasFill && !hasStroke) {
        attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + `fill="${color}"`
      }
      
      return `<${tagName}${attrs ? ' ' + attrs : ''}${selfClose}>`
    }
  )
  
  // 5. 모든 요소에 fill 속성이 없고 stroke 속성이 있으면 fill="none" 추가
  modifiedSvg = modifiedSvg.replace(
    /<(rect|circle|ellipse|line|polyline|polygon|path|g)([^>]*?)>/gi,
    (match, tagName, attrs) => {
      const hasStroke = /stroke=/i.test(attrs)
      const hasFill = /fill=/i.test(attrs)
      
      // fill 속성이 없고 stroke 속성이 있으면 fill="none" 추가
      if (!hasFill && hasStroke) {
        attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + 'fill="none"'
      }
      
      return `<${tagName}${attrs ? ' ' + attrs : ''}>`
    }
  )
  
  // 6. style 속성 내부의 stroke와 fill 처리
  modifiedSvg = modifiedSvg.replace(
    /style=["']([^"']*)["']/gi,
    (match, styleContent) => {
      let newStyle = styleContent
      
      // stroke 색상 변경 (stroke: none 제외)
      newStyle = newStyle.replace(
        /stroke:\s*([^;'"\s]+)/gi,
        (styleMatch, strokeValue) => {
          if (strokeValue === 'none' || strokeValue.startsWith('url(')) {
            return styleMatch
          }
          return `stroke: ${color}`
        }
      )
      
      // fill 색상 변경 (fill: none 제외)
      newStyle = newStyle.replace(
        /fill:\s*([^;'"\s]+)/gi,
        (styleMatch, fillValue) => {
          if (fillValue === 'none' || fillValue.startsWith('url(')) {
            return styleMatch
          }
          return `fill: ${color}`
        }
      )
      
      return `style="${newStyle}"`
    }
  )
  
  return modifiedSvg
}

/**
 * SVG의 stroke-width를 변경합니다.
 * 개별 속성, 인라인 스타일, CSS 클래스 모두 지원합니다.
 * 
 * @param svgContent SVG 문자열
 * @param strokeWidth stroke-width 값 (px 단위)
 * @returns stroke-width가 변경된 SVG 문자열
 */
export function changeSvgStrokeWidth(
  svgContent: string,
  strokeWidth: number
): string {
  let modifiedSvg = svgContent
  
  // viewBox 추출하여 stroke-width를 viewBox 기준으로 계산
  const viewBoxMatch = modifiedSvg.match(/viewBox=["']([^"']+)["']/i)
  let viewBoxWidth = 24 // 기본값
  
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/\s+/).map(Number)
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      viewBoxWidth = parts[2] // viewBox width
    }
  }
  
  // SVG의 실제 width 추출
  const widthMatch = modifiedSvg.match(/width=["']([^"']+)["']/i)
  let actualWidth = viewBoxWidth
  
  if (widthMatch) {
    const widthStr = widthMatch[1].replace(/px$/, '')
    const widthNum = parseFloat(widthStr)
    if (!isNaN(widthNum)) {
      actualWidth = widthNum
    }
  }
  
  // stroke-width를 viewBox 기준으로 계산
  // 일러스트레이터는 viewBox 기준으로 해석하므로
  // 설정한 strokeWidth(px)가 실제 크기에서 올바르게 표시되려면:
  // stroke-width(viewBox 단위) = strokeWidth(px) * (viewBoxWidth / actualWidth)
  // 예: viewBox="0 0 24 24", width="80px", strokeWidth=1.5px
  // stroke-width = 1.5 * (24/80) = 0.45
  // 일러스트레이터에서: 0.45 * (80/24) = 1.5px로 표시됨
  const scale = viewBoxWidth / actualWidth
  const strokeWidthValue = strokeWidth * scale
  
  // 단위 없이 설정 (일러스트레이터가 viewBox 기준으로 해석)
  const strokeWidthStr = strokeWidthValue.toString()
  
  // 1. 개별 stroke-width 속성 변경 (단위 없이)
  modifiedSvg = modifiedSvg.replace(
    /stroke-width=["']([^"']+)["']/gi,
    `stroke-width="${strokeWidthStr}"`
  )
  
  // 2. 인라인 style 속성 내부의 stroke-width 변경/추가
  modifiedSvg = modifiedSvg.replace(
    /style=["']([^"']*)["']/gi,
    (match, styleContent) => {
      let newStyle = styleContent
      
      // 기존 stroke-width가 있으면 변경
      if (/stroke-width:\s*[^;'"\s]+/gi.test(newStyle)) {
        newStyle = newStyle.replace(
          /stroke-width:\s*[^;'"\s]+/gi,
          `stroke-width: ${strokeWidthStr}`
        )
      } else {
        // stroke 속성이 있으면 stroke-width 추가
        if (/stroke:\s*[^;'"\s]+/gi.test(newStyle)) {
          newStyle = newStyle.trim()
          if (!newStyle.endsWith(';')) {
            newStyle += ';'
          }
          newStyle += ` stroke-width: ${strokeWidthStr}`
        }
      }
      
      return `style="${newStyle}"`
    }
  )
  
  // 3. CSS 클래스 내부의 stroke-width 변경/추가 (<style> 태그)
  modifiedSvg = modifiedSvg.replace(
    /<style[^>]*>([\s\S]*?)<\/style>/gi,
    (match, styleContent) => {
      let newStyleContent = styleContent
      
      // 각 클래스 내부의 stroke-width 변경/추가
      newStyleContent = newStyleContent.replace(
        /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/gi,
        (classMatch: string, className: string, classProps: string) => {
          // stroke 속성이 있으면 stroke-width 추가/변경
          if (/stroke:\s*[^;'"\s]+/gi.test(classProps)) {
            if (/stroke-width:\s*[^;'"\s]+/gi.test(classProps)) {
              // 기존 stroke-width 변경
              classProps = classProps.replace(
                /stroke-width:\s*[^;'"\s]+/gi,
                `stroke-width: ${strokeWidthStr}`
              )
            } else {
              // stroke-width 추가
              classProps = classProps.trim()
              if (!classProps.endsWith(';')) {
                classProps += ';'
              }
              classProps += ` stroke-width: ${strokeWidthStr};`
            }
          }
          return `.${className}{${classProps}}`
        }
      )
      
      return match.replace(styleContent, newStyleContent)
    }
  )
  
  // 4. stroke 속성이 있지만 stroke-width가 없는 경우 추가 (모든 요소, style 속성 없는 경우)
  // rect, circle, ellipse, line, polyline, polygon, path, g 모두 포함
  // self-closing 태그 처리 개선
  modifiedSvg = modifiedSvg.replace(
    /<(rect|circle|ellipse|line|polyline|polygon|path|g)([^>]*?)(\/?)>/gi,
    (match, tagName, attrs, selfClose) => {
      // stroke 속성이 있고, stroke-width가 없고, style 속성이 없으면 stroke-width 추가
      if (/stroke=/i.test(attrs) && !/stroke-width=/i.test(attrs) && !/style=/i.test(attrs)) {
        attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + `stroke-width="${strokeWidthStr}"`
      }
      return `<${tagName}${attrs ? ' ' + attrs : ''}${selfClose}>`
    }
  )
  
  return modifiedSvg
}

/**
 * ICON 페이지용 SVG 속성 통합 변경 함수
 * 색상, stroke-width, 크기를 한 번에 적용합니다.
 * fill="none"을 명시적으로 보장합니다.
 * 
 * @param svgContent SVG 문자열
 * @param color 색상 (hex 코드)
 * @param strokeWidth stroke-width 값 (px)
 * @param size 크기 (px)
 * @returns 속성이 변경된 SVG 문자열
 */
export function changeIconSvgProperties(
  svgContent: string,
  color: string,
  strokeWidth: number,
  size: number
): string {
  let modifiedSvg = svgContent
  
  // 1. 색상 변경 (fill="none" 유지)
  modifiedSvg = changeAllSvgColors(modifiedSvg, color)
  
  // 2. 크기를 먼저 변경 (stroke-width 계산을 위해)
  modifiedSvg = resizeSvg(modifiedSvg, size, size, true)
  
  // 3. stroke-width 변경 (크기 변경 후 actualWidth가 올바르게 설정됨)
  modifiedSvg = changeSvgStrokeWidth(modifiedSvg, strokeWidth)
  
  // 4. 모든 stroke 요소에 fill="none" 명시적 추가 (없는 경우만)
  modifiedSvg = modifiedSvg.replace(
    /<(rect|circle|ellipse|line|polyline|polygon|path|g)([^>]*?)>/gi,
    (match, tagName, attrs) => {
      // stroke가 있고 fill이 없으면 fill="none" 추가
      if (/stroke=/i.test(attrs) && !/fill=/i.test(attrs)) {
        attrs = attrs.trim() + (attrs.trim() ? ' ' : '') + 'fill="none"'
      }
      return `<${tagName}${attrs ? ' ' + attrs : ''}>`
    }
  )
  
  return modifiedSvg
}

/**
 * 정규식에서 특수 문자를 이스케이프합니다.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * SVG에서 사용된 색상을 추출합니다.
 * fill, stroke 속성의 색상 값을 추출합니다.
 * 
 * @param svgContent SVG 문자열
 * @returns 발견된 색상 배열
 */
export function extractColors(svgContent: string): string[] {
  const colors = new Set<string>()

  // fill 속성에서 색상 추출
  const fillMatches = svgContent.matchAll(/fill=["']([^"']+)["']/gi)
  for (const match of fillMatches) {
    if (match[1] && !match[1].includes('url(') && !match[1].includes('none')) {
      colors.add(match[1].trim())
    }
  }

  // stroke 속성에서 색상 추출
  const strokeMatches = svgContent.matchAll(/stroke=["']([^"']+)["']/gi)
  for (const match of strokeMatches) {
    if (match[1] && !match[1].includes('url(') && !match[1].includes('none')) {
      colors.add(match[1].trim())
    }
  }

  // style 속성 내부의 색상 추출
  const styleMatches = svgContent.matchAll(/(?:fill|stroke):\s*([^;'"\s]+)/gi)
  for (const match of styleMatches) {
    if (match[1] && !match[1].includes('url(') && !match[1].includes('none')) {
      colors.add(match[1].trim())
    }
  }

  return Array.from(colors)
}

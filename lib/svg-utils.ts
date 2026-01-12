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

  // 먼저 기존 width와 height 속성을 제거
  modifiedSvg = modifiedSvg.replace(/\s+width=["'][^"']*["']/gi, '')
  modifiedSvg = modifiedSvg.replace(/\s+height=["'][^"']*["']/gi, '')

  // width 속성 추가
  if (width !== undefined) {
    const widthValue = typeof width === 'number' ? `${width}px` : width
    modifiedSvg = modifiedSvg.replace(
      /<svg([^>]*?)>/i,
      (match, attrs) => {
        // attrs 끝에 공백이 없으면 추가
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
        // attrs 끝에 공백이 없으면 추가
        const trimmedAttrs = attrs.trim()
        const separator = trimmedAttrs ? ' ' : ''
        return `<svg${separator}${trimmedAttrs} height="${heightValue}">`
      }
    )
  }

  // 정비율 유지: viewBox 유지 (이미 존재하면 그대로 사용)
  if (maintainAspectRatio && !modifiedSvg.match(/viewBox=["'][^"']*["']/i)) {
    // viewBox가 없으면 추가 (기본값)
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
        (tspanMatch, tspanAttrs, tspanContent) => {
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
  
  // 모든 fill 속성을 선택한 색상으로 변경 (url(), none 제외)
  modifiedSvg = modifiedSvg.replace(
    /fill=["']((?!url\(|none)[^"']+)["']/gi,
    `fill="${color}"`
  )
  
  // 모든 stroke 속성을 선택한 색상으로 변경 (url(), none 제외)
  modifiedSvg = modifiedSvg.replace(
    /stroke=["']((?!url\(|none)[^"']+)["']/gi,
    `stroke="${color}"`
  )
  
  // style 속성 내부의 fill과 stroke도 변경
  modifiedSvg = modifiedSvg.replace(
    /style=["']([^"']*)["']/gi,
    (match, styleContent) => {
      let newStyle = styleContent
        .replace(/fill:\s*[^;'"\s]+/gi, `fill: ${color}`)
        .replace(/stroke:\s*[^;'"\s]+/gi, `stroke: ${color}`)
      return `style="${newStyle}"`
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

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { resolveUploadSrc, resolveBlurSrc } from '@/api/client'

export interface CarouselSlide {
  id: number
  title: string
  image_url: string
  link_url: string
  sort_order: number
  is_active: boolean
}

interface CarouselProps {
  slides: CarouselSlide[]
  height?: number
  autoplay?: boolean
  interval?: number
  className?: string
}

// 单张轮播图：模糊占位图先显示，原图下载完成后 cross-fade 淡入（渐进加载）
function Slide({ slide, height, eager }: { slide: CarouselSlide; height: number; eager: boolean }) {
  const [loaded, setLoaded] = useState(false)     // 原图加载完成，触发淡入
  const [failed, setFailed] = useState(false)     // 原图加载失败：只留占位图/底色
  const [blurFailed, setBlurFailed] = useState(false)
  const fullRef = useRef<HTMLImageElement>(null)

  // 原图在挂载前已从缓存完成加载时不会再触发 onLoad，挂载后兜底检查
  useEffect(() => {
    const img = fullRef.current
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])

  const loading = eager ? 'eager' : 'lazy'
  const alt = slide.title || `轮播图 ${slide.id}`
  const blurSrc = resolveBlurSrc(slide.image_url)

  const content = (
    <>
      {blurSrc && !blurFailed && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          loading={loading}
          onError={() => setBlurFailed(true)}
          className="absolute inset-0 h-full w-full object-cover scale-105 blur-sm"
        />
      )}
      {!failed && (
        <img
          ref={fullRef}
          src={resolveUploadSrc(slide.image_url)}
          alt={alt}
          loading={loading}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </>
  )

  // 尺寸类统一落在最外层（a/div 共用），保证 flex 轨道 translateX 计算不受影响
  const wrapperClass = 'block w-full flex-shrink-0 relative overflow-hidden bg-muted'
  const wrapperStyle = { height: `${height}px` }

  return slide.link_url ? (
    <a href={slide.link_url} rel="noopener noreferrer" className={wrapperClass} style={wrapperStyle}>
      {content}
    </a>
  ) : (
    <div className={wrapperClass} style={wrapperStyle}>{content}</div>
  )
}

export default function Carousel({ slides, height = 400, autoplay = true, interval = 5000, className = '' }: CarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = slides.length
  const shouldAutoplay = autoplay && total > 1 && !isHovered

  const goTo = useCallback((index: number) => {
    setCurrent(((index % total) + total) % total)
  }, [total])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  // Autoplay timer
  useEffect(() => {
    if (shouldAutoplay) {
      timerRef.current = setInterval(next, interval)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [shouldAutoplay, next, interval])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next])

  if (total === 0) return null

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="轮播图"
    >
      {/* Slides container */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide) => (
          <Slide key={slide.id} slide={slide} height={height} eager={current === 0} />
        ))}
      </div>

      {/* Left Arrow */}
      {total > 1 && (
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:!opacity-100 focus:opacity-100"
          style={{ opacity: isHovered ? 1 : 0 }}
          aria-label="上一张"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Right Arrow */}
      {total > 1 && (
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all"
          style={{ opacity: isHovered ? 1 : 0 }}
          aria-label="下一张"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`第 ${i + 1} 张`}
              aria-current={i === current ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

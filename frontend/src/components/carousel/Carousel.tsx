import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
  autoplay?: boolean
  interval?: number
  className?: string
}

export default function Carousel({ slides, autoplay = true, interval = 5000, className = '' }: CarouselProps) {
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
        {slides.map((slide) => {
          const inner = (
            <div
              key={slide.id}
              className="w-full flex-shrink-0 relative"
              style={{ aspectRatio: '16 / 5' }}
            >
              <img
                src={slide.image_url}
                alt={slide.title || `轮播图 ${slide.id}`}
                className="w-full h-full object-cover"
                loading={current === 0 ? 'eager' : 'lazy'}
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
          )

          if (slide.link_url) {
            return (
              <a
                key={slide.id}
                href={slide.link_url}
                rel="noopener noreferrer"
                className="w-full flex-shrink-0 block"
                style={{ aspectRatio: '16 / 5' }}
              >
                {inner.props.children}
              </a>
            )
          }
          return inner
        })}
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

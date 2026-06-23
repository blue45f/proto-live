import React, { useEffect, useRef, useState } from 'react'

export const IntroSplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('has-seen-protolive-intro')
    }
    return true
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const timer = setTimeout(() => {
      setIsVisible(false)
      sessionStorage.setItem('has-seen-protolive-intro', 'true')
    }, 2800)

    return () => clearTimeout(timer)
  }, [isVisible])

  // Wireframe / Prototyping grid Canvas animation
  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Vector dots and drawing vectors
    const particles: Array<{
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: string
      alpha: number
    }> = []

    const colors = [
      'rgba(190, 242, 100, ', // Lime 300
      'rgba(132, 204, 22, ', // Lime 500
      'rgba(163, 230, 53, ', // Lime 400
    ]

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)] ?? 'rgba(190, 242, 100, ',
        alpha: Math.random() * 0.5 + 0.3,
      })
    }

    // Grid coordinates
    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(190, 242, 100, 0.02)'
      ctx.lineWidth = 0.5
      const spacing = 50

      for (let x = 0; x < width; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    const draw = () => {
      ctx.fillStyle = '#090a0f' // Dark slate-black
      ctx.fillRect(0, 0, width, height)

      drawGrid()

      const centerX = width / 2
      const centerY = height / 2

      // Draw interactive wireframe prototyping boxes in center
      ctx.strokeStyle = 'rgba(190, 242, 100, 0.06)'
      ctx.lineWidth = 1

      // Inner wireframe square
      ctx.strokeRect(centerX - 80, centerY - 80, 160, 160)
      ctx.beginPath()
      ctx.moveTo(centerX - 80, centerY - 80)
      ctx.lineTo(centerX + 80, centerY + 80)
      ctx.moveTo(centerX + 80, centerY - 80)
      ctx.lineTo(centerX - 80, centerY + 80)
      ctx.stroke()

      // Outer wireframe circle
      ctx.strokeStyle = 'rgba(190, 242, 100, 0.03)'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2)
      ctx.stroke()

      // Move & Draw vector nodes
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        // Bounce
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.fillStyle = p.color + p.alpha + ')'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw connection lines representing live prototype links
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i]
          const pj = particles[j]
          if (!pi || !pj) continue

          const dx = pi.x - pj.x
          const dy = pi.y - pj.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 140) {
            const alphaVal = (1 - dist / 140) * 0.15
            ctx.strokeStyle = `rgba(190, 242, 100, ${alphaVal})`
            ctx.beginPath()
            ctx.moveTo(pi.x, pi.y)
            ctx.lineTo(pj.x, pj.y)
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="pl-splash-overlay">
      <canvas ref={canvasRef} className="pl-splash-canvas" />

      <div className="pl-splash-content">
        {/* Core Wireframe Node Logo */}
        <div className="pl-splash-logo-wrapper">
          <div className="pl-splash-logo-glow" />
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pl-splash-icon"
          >
            {/* Zap / Prototyping lightning bolt */}
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        {/* Text */}
        <h1 className="pl-splash-title">
          ProtoLive<span className="pl-splash-beta">Beta</span>
        </h1>
        <p className="pl-splash-subtitle">Live Interactive Prototyping Workspace</p>

        {/* Code compiling line */}
        <div className="pl-splash-code font-mono">
          <span>struct Prototype &lt;'a&gt; &#123; state: LiveStream &#125;</span>
        </div>
      </div>

      <style>{`
        .pl-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #090a0f;
          overflow: hidden;
          user-select: none;
          animation: plFadeOut 0.8s cubic-bezier(0.16, 1, 0.3, 1) 2.5s forwards;
        }

        .pl-splash-canvas {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .pl-splash-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .pl-splash-logo-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 88px;
          height: 88px;
          background: rgba(18, 20, 29, 0.95);
          border: 1px solid rgba(190, 242, 100, 0.3);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(190, 242, 100, 0.1);
          animation: plPopIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .pl-splash-logo-glow {
          position: absolute;
          inset: -2px;
          border-radius: 26px;
          background: linear-gradient(135deg, #bef264, #84cc16);
          z-index: -1;
          opacity: 0.4;
          animation: plPulse 2.2s infinite ease-in-out;
        }

        .pl-splash-icon {
          color: #bef264;
          filter: drop-shadow(0 0 10px rgba(190, 242, 100, 0.7));
          animation: plZapScale 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .pl-splash-title {
          margin-top: 1.75rem;
          font-size: 2.25rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          opacity: 0;
          transform: translateY(10px);
          animation: plTextReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
        }

        .pl-splash-beta {
          padding: 1px 6px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0;
          color: #84cc16;
          border: 1px solid rgba(132, 204, 22, 0.4);
          border-radius: 999px;
          text-transform: uppercase;
        }

        .pl-splash-subtitle {
          margin-top: 0.5rem;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: #94a3b8;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(10px);
          animation: plTextReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
        }

        .pl-splash-code {
          margin-top: 2rem;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
          color: rgba(190, 242, 100, 0.45);
          opacity: 0;
          animation: plFadeIn 1s ease-in 1.2s forwards;
        }

        @keyframes plPopIn {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes plZapScale {
          0% { transform: scale(0.6) rotate(-20deg); }
          50% { transform: scale(1.15) rotate(10deg); }
          100% { transform: scale(1) rotate(0); }
        }

        @keyframes plPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.08); opacity: 0.55; }
        }

        @keyframes plTextReveal {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes plFadeIn {
          to { opacity: 1; }
        }

        @keyframes plFadeOut {
          to { opacity: 0; visibility: hidden; filter: blur(15px); }
        }
      `}</style>
    </div>
  )
}

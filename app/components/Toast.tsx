'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastItem = {
  id: string
  type: 'confirmed' | 'rejected'
  vendorName: string
  stageName: string
}

type Props = {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export default function Toast({ toasts, onDismiss }: Props) {
  useEffect(() => {
    if (toasts.length === 0) return
    const latest = toasts[toasts.length - 1]
    const timer = setTimeout(() => onDismiss(latest.id), 6000)
    return () => clearTimeout(timer)
  }, [toasts, onDismiss])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl px-5 py-4 shadow-2xl max-w-sm"
            style={{
              background: t.type === 'confirmed' ? 'rgba(22,163,74,0.95)' : 'rgba(220,38,38,0.92)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${t.type === 'confirmed' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)'}`,
            }}
          >
            <span className="text-2xl shrink-0 mt-0.5">
              {t.type === 'confirmed' ? '✅' : '❌'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">
                {t.type === 'confirmed' ? '미팅 확정!' : '미팅 거절됨'}
              </p>
              <p className="text-white/85 text-xs mt-0.5 leading-relaxed">
                <span className="font-semibold">{t.vendorName}</span>
                {t.type === 'confirmed'
                  ? `이(가) [${t.stageName}] 미팅을 확정했습니다.`
                  : `이(가) [${t.stageName}] 미팅을 거절했습니다.`}
              </p>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 text-white/60 hover:text-white text-lg leading-none ml-1"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

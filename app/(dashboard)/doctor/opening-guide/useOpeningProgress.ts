'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseOpeningProgressReturn {
  done: Set<number>
  loading: boolean
  toggle: (id: number) => void
}

export function useOpeningProgress(): UseOpeningProgressReturn {
  const [done, setDone] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  // 저장 debounce를 위한 타이머 ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 최신 done 값을 저장 함수에서 참조하기 위한 ref
  const doneRef = useRef<Set<number>>(done)

  useEffect(() => {
    doneRef.current = done
  }, [done])

  // 서버에서 진행 상태 로드
  useEffect(() => {
    fetch('/api/opening-guide/progress')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.completed_steps)) {
          setDone(new Set(data.completed_steps))
        }
      })
      .catch(() => {}) // 네트워크 오류 시 빈 Set 유지
      .finally(() => setLoading(false))
  }, [])

  // debounce 저장 (300ms 내 연속 토글 시 마지막 1번만 저장)
  const scheduleSave = useCallback((nextDone: Set<number>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/opening-guide/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_steps: [...nextDone] }),
      }).catch(() => {})
    }, 300)
  }, [])

  const toggle = useCallback((id: number) => {
    setDone(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  return { done, loading, toggle }
}

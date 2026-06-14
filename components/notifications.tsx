"use client"

import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { useAppState } from '@/lib/app-state'

export function Notifications() {
  const { notifications, removeNotification } = useAppState()

  if (notifications.length === 0) return null

  const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
  }

  const colors = {
    success: '#4ade80',
    info: '#22d3ee',
    warning: '#fbbf24',
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((n) => {
        const Icon = icons[n.type]
        const color = colors[n.type]
        return (
          <div
            key={n.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300"
            style={{ background: 'oklch(0.16 0.015 260)', border: `1px solid ${color}25` }}
          >
            <Icon className="size-4 flex-shrink-0 mt-0.5" style={{ color }} />
            <p className="text-sm flex-1">{n.message}</p>
            <button onClick={() => removeNotification(n.id)} className="flex-shrink-0 hover:text-foreground text-muted-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

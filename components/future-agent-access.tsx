/*
Future mobile / browser-extension access surface.

This is intentionally commented out for the first hosted web-app release.
Customers should buy an agent and use it directly from the Operant dashboard.

When mobile app, PWA install, or browser extension versions are ready, this
can become the starting point for those entry points without changing the core
product promise.

"use client"

import { Smartphone, Monitor, Puzzle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type FutureAgentAccessProps = {
  agentName: string
  agentColor: string
}

export function FutureAgentAccess({ agentName, agentColor }: FutureAgentAccessProps) {
  const options = [
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: `${agentName} will be available from a streamlined mobile experience.`,
    },
    {
      icon: Monitor,
      title: 'Desktop Browser',
      description: `${agentName} will open from the hosted dashboard on any modern browser.`,
    },
    {
      icon: Puzzle,
      title: 'Browser Extension',
      description: `${agentName} can later be surfaced beside customer workflows.`,
    },
  ]

  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <div key={option.title} className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <option.icon className="size-4" style={{ color: agentColor }} />
            <span className="text-sm font-semibold">{option.title}</span>
            <Badge variant="secondary" className="ml-auto text-xs">Later</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </div>
      ))}
    </div>
  )
}
*/

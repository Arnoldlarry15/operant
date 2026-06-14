"use client"

import { useState } from 'react'
import { Download, Monitor, Smartphone, Code2, X, Check, Copy, ExternalLink, Terminal, Apple, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Companion = {
  id: string
  name: string
  color: string
  emoji: string
  trait: string
  companion_type: string
  level: number
}

type Props = {
  companion: Companion
  onClose: () => void
}

type Tab = 'desktop' | 'mobile' | 'api'

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: 'oklch(0.08 0.01 260)', border: '1px solid oklch(0.18 0.015 260)' }}>
      {label && (
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid oklch(0.14 0.01 260)' }}>
          <span className="text-xs font-mono text-muted-foreground">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: copied ? '#4ade80' : 'oklch(0.55 0.02 260)' }}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      {!label && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 flex items-center gap-1 text-xs transition-colors z-10"
          style={{ color: copied ? '#4ade80' : 'oklch(0.45 0.02 260)' }}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      <pre className="px-4 py-3 text-xs font-mono leading-relaxed overflow-x-auto" style={{ color: 'oklch(0.82 0.04 260)' }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 size-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
        style={{ background: 'oklch(0.75 0.18 195 / 15%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 30%)' }}>
        {n}
      </div>
      <div className="flex-1 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}

export function DeployModal({ companion, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('desktop')
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/deploy?companionId=${companion.id}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = companion.name.replace(/[^a-zA-Z0-9]/g, '_')
      a.download = `${safe}_operant.zip`
      a.click()
      URL.revokeObjectURL(url)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 4000)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'desktop', label: 'Desktop', icon: <Monitor className="size-3.5" /> },
    { id: 'mobile',  label: 'Mobile',  icon: <Smartphone className="size-3.5" /> },
    { id: 'api',     label: 'API',     icon: <Code2 className="size-3.5" /> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'oklch(0.05 0.01 260 / 80%)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: 'oklch(0.10 0.015 260)',
          border: `1px solid ${companion.color}30`,
          boxShadow: `0 0 60px ${companion.color}15, 0 25px 50px oklch(0 0 0 / 60%)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 flex-shrink-0" style={{ borderBottom: '1px solid oklch(0.16 0.015 260)' }}>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${companion.color}15`, border: `1px solid ${companion.color}30` }}>
              {companion.emoji}
            </div>
            <div>
              <h2 className="font-heading font-bold text-base" style={{ color: companion.color }}>
                Deploy {companion.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Take your AI companion anywhere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Download banner */}
        <div className="px-6 pt-5 flex-shrink-0">
          <div className="rounded-xl p-4 flex items-center justify-between gap-4"
            style={{ background: `${companion.color}08`, border: `1px solid ${companion.color}20` }}>
            <div>
              <p className="text-sm font-semibold text-foreground">Download your AI package</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Includes the agent script, launchers, and setup instructions
              </p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-shrink-0 gap-2 font-semibold text-xs h-9"
              style={{ background: companion.color, color: '#000' }}
            >
              {downloaded
                ? <><Check className="size-3.5" /> Downloaded!</>
                : downloading
                ? <><span className="animate-spin">⟳</span> Packing...</>
                : <><Download className="size-3.5" /> Download .zip</>
              }
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-5 flex-shrink-0">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'oklch(0.07 0.01 260)', border: '1px solid oklch(0.14 0.01 260)' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                style={tab === t.id
                  ? { background: companion.color, color: '#000' }
                  : { color: 'oklch(0.55 0.02 260)' }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── DESKTOP ── */}
          {tab === 'desktop' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="size-4" style={{ color: companion.color }} />
                  <span className="text-sm font-semibold text-foreground">macOS / Linux</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Step n={1}>
                    Download the .zip above and unzip it anywhere you like.
                  </Step>
                  <Step n={2}>
                    Get a free API key at{' '}
                    <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                      className="underline underline-offset-2" style={{ color: companion.color }}>
                      console.anthropic.com
                    </a>
                  </Step>
                  <Step n={3}>
                    Open Terminal in the unzipped folder and run:
                    <CodeBlock code={`export ANTHROPIC_API_KEY=sk-ant-your-key-here\nchmod +x launch_macos.sh\n./launch_macos.sh`} />
                  </Step>
                  <Step n={4}>
                    Or just <strong className="text-foreground">double-click</strong>{' '}
                    <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.14 0.01 260)', color: companion.color }}>
                      launch_macos.sh
                    </code>{' '}
                    — it will prompt you for the key on first run.
                  </Step>
                </div>
              </div>

              <div style={{ borderTop: '1px solid oklch(0.16 0.015 260)', paddingTop: '1.25rem' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="size-4" style={{ color: companion.color }} />
                  <span className="text-sm font-semibold text-foreground">Windows</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Step n={1}>Download and unzip the package.</Step>
                  <Step n={2}>
                    Get a free API key at{' '}
                    <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                      className="underline underline-offset-2" style={{ color: companion.color }}>
                      console.anthropic.com
                    </a>
                  </Step>
                  <Step n={3}>
                    Double-click{' '}
                    <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.14 0.01 260)', color: companion.color }}>
                      launch_windows.bat
                    </code>
                    {' '}— it will install dependencies and prompt for your key automatically.
                  </Step>
                </div>
              </div>

              <div className="rounded-xl p-4 text-xs text-muted-foreground leading-relaxed"
                style={{ background: 'oklch(0.08 0.01 260)', border: '1px solid oklch(0.14 0.01 260)' }}>
                💡 <strong className="text-foreground">Python 3.8+</strong> is required.
                Download it free at{' '}
                <a href="https://python.org" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  python.org
                </a>{' '}
                if you don't have it yet.
              </div>
            </div>
          )}

          {/* ── MOBILE ── */}
          {tab === 'mobile' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Apple className="size-4" style={{ color: companion.color }} />
                  <span className="text-sm font-semibold text-foreground">iOS (iPhone / iPad)</span>
                  <Badge className="text-xs" style={{ background: `${companion.color}15`, color: companion.color, border: `1px solid ${companion.color}30` }}>
                    No App Store needed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {companion.name} works as a Progressive Web App — it installs directly from your browser.
                </p>
                <div className="flex flex-col gap-3">
                  <Step n={1}>
                    Open <strong className="text-foreground">Safari</strong> on your iPhone or iPad and go to{' '}
                    <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.14 0.01 260)', color: companion.color }}>
                      operant.ai
                    </code>
                  </Step>
                  <Step n={2}>
                    Sign in to your Operant account and open{' '}
                    <strong className="text-foreground">{companion.name}</strong> in your dashboard.
                  </Step>
                  <Step n={3}>
                    Tap the <strong className="text-foreground">Share</strong> button (box with an arrow at the bottom of Safari), then tap{' '}
                    <strong className="text-foreground">Add to Home Screen</strong>.
                  </Step>
                  <Step n={4}>
                    Tap <strong className="text-foreground">Add</strong> — {companion.emoji} {companion.name} now appears on your home screen like a native app.
                  </Step>
                </div>
              </div>

              <div style={{ borderTop: '1px solid oklch(0.16 0.015 260)', paddingTop: '1.25rem' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="size-4" style={{ color: companion.color }} />
                  <span className="text-sm font-semibold text-foreground">Android</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Step n={1}>
                    Open <strong className="text-foreground">Chrome</strong> and go to{' '}
                    <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'oklch(0.14 0.01 260)', color: companion.color }}>
                      operant.ai
                    </code>
                  </Step>
                  <Step n={2}>Sign in and open {companion.name}.</Step>
                  <Step n={3}>
                    Chrome will show an{' '}
                    <strong className="text-foreground">Install</strong> banner at the bottom — tap it.
                    Or tap the 3-dot menu → <strong className="text-foreground">Add to Home screen</strong>.
                  </Step>
                  <Step n={4}>
                    {companion.emoji} {companion.name} is now installed on your Android home screen.
                  </Step>
                </div>
              </div>

              <div className="rounded-xl p-4 text-xs text-muted-foreground leading-relaxed"
                style={{ background: 'oklch(0.08 0.01 260)', border: '1px solid oklch(0.14 0.01 260)' }}>
                📱 The mobile app uses your existing Operant account — no separate login or API key needed. Your conversation history syncs automatically.
              </div>
            </div>
          )}

          {/* ── API ── */}
          {tab === 'api' && (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-muted-foreground">
                Talk to {companion.name} directly through the Operant API — integrate it into your own app, workflow, or script.
              </p>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Your companion ID</p>
                <CodeBlock code={companion.id} />
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Send a message (curl)</p>
                <CodeBlock
                  label="bash"
                  code={`curl -X POST https://operant.ai/api/chat/companion \\
  -H "Content-Type: application/json" \\
  -H "Cookie: <your session cookie>" \\
  -d '{
    "companionId": "${companion.id}",
    "messages": [
      { "role": "user", "content": "Hello ${companion.name}!" }
    ]
  }'`}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">JavaScript / TypeScript</p>
                <CodeBlock
                  label="typescript"
                  code={`const response = await fetch('https://operant.ai/api/chat/companion', {
  method: 'POST',
  credentials: 'include', // sends your session cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    companionId: '${companion.id}',
    messages: [
      { role: 'user', content: 'Hello ${companion.name}!' }
    ],
  }),
})

// Response is a streaming text/event-stream
const reader = response.body?.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader!.read()
  if (done) break
  console.log(decoder.decode(value))
}`}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Python</p>
                <CodeBlock
                  label="python"
                  code={`import requests

resp = requests.post(
    "https://operant.ai/api/chat/companion",
    json={
        "companionId": "${companion.id}",
        "messages": [{"role": "user", "content": "Hello ${companion.name}!"}],
    },
    cookies={"<session>": "<your cookie>"},
    stream=True,
)

for chunk in resp.iter_content(chunk_size=None):
    print(chunk.decode(), end="", flush=True)`}
                />
              </div>

              <div className="rounded-xl p-4 text-xs text-muted-foreground leading-relaxed"
                style={{ background: 'oklch(0.08 0.01 260)', border: '1px solid oklch(0.14 0.01 260)' }}>
                🔑 API auth uses your session cookie. For server-to-server integrations, a dedicated API key system is coming soon.
                <a href="mailto:support@operant.ai" className="ml-1 underline underline-offset-2" style={{ color: companion.color }}>
                  Join the waitlist →
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
          style={{ borderTop: '1px solid oklch(0.14 0.01 260)' }}>
          <span className="text-xs text-muted-foreground">
            {companion.emoji} {companion.name} · Level {companion.level} · {companion.companion_type}
          </span>
          <a
            href="https://operant.ai/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs underline underline-offset-2"
            style={{ color: companion.color }}
          >
            Full docs <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

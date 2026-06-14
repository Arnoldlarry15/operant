"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, ArrowLeft, Zap, Star, Sparkles, Bot, Cpu, Download } from 'lucide-react'
import { getCompanion, getMessages, saveMessage, updateCompanionXP } from '@/lib/actions'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { DeployModal } from '@/components/deploy-modal'

type InstalledSkill = { id: string; skill_id: string; skill_name: string; installed_at: string }

type Companion = {
  id: string
  name: string
  color: string
  emoji: string
  trait: string
  level: number
  xp: number
  message_count: number
  companion_type: string
  personality_id: string | null
  prebuilt_id: string | null
  companion_skills?: InstalledSkill[]
}

type Message = { id?: string; role: 'user' | 'ai'; text: string }

export default function CompanionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [companion, setCompanion] = useState<Companion | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [msgCount, setMsgCount] = useState(0)
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([])
  const [showDeploy, setShowDeploy] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadCompanion = useCallback(async () => {
    if (!user || !id) return
    setLoading(true)
    const data = await getCompanion(id)
    if (!data) {
      router.push('/')
      return
    }
    const c = data as Companion
    setCompanion(c)
    setLevel(c.level)
    setXp(c.xp)
    setMsgCount(c.message_count)
    setInstalledSkills(c.companion_skills ?? [])

    const msgs = await getMessages(id)
    if (msgs.length > 0) {
      setMessages(msgs.map((m: { id: string; role: 'user' | 'ai'; content: string }) => ({
        id: m.id,
        role: m.role,
        text: m.content,
      })))
    } else {
      const greeting: Message = {
        role: 'ai',
        text: `Hello! I'm ${c.name} — your ${c.companion_type} AI companion. I'm ready to assist you. What would you like to explore today?`,
      }
      setMessages([greeting])
      await saveMessage(id, 'ai', greeting.text)
    }
    setLoading(false)
  }, [user, id, router])

  useEffect(() => {
    if (!authLoading && user) loadCompanion()
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, loadCompanion, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() || !companion || isTyping) return
    const text = input.trim()
    setInput('')

    const newUserMsg: Message = { role: 'user', text }
    setMessages((prev) => [...prev, newUserMsg])
    await saveMessage(companion.id, 'user', text)

    const result = await updateCompanionXP(companion.id, 8)
    if (result && 'xp' in result) {
      setXp(result.xp as number)
      setLevel(result.level as number)
    }
    setMsgCount((n) => n + 1)

    setIsTyping(true)

    // Build the full conversation history in ModelMessage format
    const allMsgs = [...messages, newUserMsg]
    const modelMessages = allMsgs.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }))

    // Placeholder bubble that we stream tokens into
    setMessages((prev) => [...prev, { role: 'ai', text: '' }])

    try {
      const res = await fetch('/api/chat/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companionId: companion.id, messages: modelMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''
      // Hide the typing indicator once the first token arrives
      let firstToken = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'text-delta' && parsed.delta) {
              if (firstToken) {
                setIsTyping(false)
                firstToken = false
              }
              fullText += parsed.delta
              setMessages((prev) => {
                const next = [...prev]
                next[next.length - 1] = { role: 'ai', text: fullText }
                return next
              })
            }
          } catch {
            // skip malformed chunk
          }
        }
      }

      setIsTyping(false)
      if (fullText) await saveMessage(companion.id, 'ai', fullText)
    } catch {
      setIsTyping(false)
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'ai', text: 'I ran into a hiccup connecting — give me a moment and try again.' }
        return next
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const xpPerLevel = 100
  const currentLevelXP = xp % xpPerLevel
  const xpProgress = (currentLevelXP / xpPerLevel) * 100
  const typeLabel = companion?.companion_type === 'prebuilt' ? 'Pre-built' : 'Custom'

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full animate-pulse" style={{ background: 'oklch(0.75 0.18 195 / 20%)' }} />
          <p className="text-muted-foreground text-sm">Loading companion…</p>
        </div>
      </div>
    )
  }

  if (!companion) return null

  return (
    <div className="min-h-screen pt-20 px-4 pb-8">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="flex flex-col gap-4">
            {/* Companion card */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-4" style={{ border: `1px solid ${companion.color}30` }}>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div
                  className="size-20 rounded-2xl flex items-center justify-center text-4xl relative"
                  style={{ background: `${companion.color}15`, border: `2px solid ${companion.color}30`, boxShadow: `0 0 30px ${companion.color}20` }}
                >
                  {companion.emoji}
                  <div className="absolute -bottom-2 -right-2 size-7 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195)', boxShadow: '0 0 12px oklch(0.75 0.18 195 / 50%)' }}>
                    <Zap className="size-3.5 text-black" />
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="font-heading font-bold text-2xl" style={{ color: companion.color }}>{companion.name}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{companion.trait}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className="text-xs" style={{ background: `${companion.color}15`, color: companion.color, border: `1px solid ${companion.color}30` }}>
                      {typeLabel}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="size-2.5 mr-1" />Lv.{level}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* XP progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">XP Progress</span>
                  <span className="text-xs font-semibold text-primary">{currentLevelXP} / {xpPerLevel}</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{xpPerLevel - currentLevelXP} XP until Level {level + 1}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Level', value: level, color: companion.color },
                  { label: 'Chats', value: msgCount, color: 'oklch(0.75 0.18 195)' },
                  { label: 'Total XP', value: xp, color: 'oklch(0.75 0.18 195)' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5 p-2 rounded-xl" style={{ background: 'oklch(0.16 0.015 260)' }}>
                    <p className="font-heading font-bold text-base" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Info card */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-heading font-bold text-sm">About This AI</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{companion.companion_type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">XP per message</span>
                  <span className="font-medium text-primary">+8 XP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Trait</span>
                  <span className="font-medium max-w-[120px] text-right truncate">{companion.trait}</span>
                </div>
              </div>
              <div className="mt-1 p-3 rounded-xl text-xs text-muted-foreground leading-relaxed" style={{ background: 'oklch(0.16 0.015 260)' }}>
                <span className="text-foreground font-semibold">Tip:</span> Chat regularly to earn XP and level up your companion. Higher levels unlock more advanced capabilities.
              </div>

              {/* Deploy button */}
              <Button
                onClick={() => setShowDeploy(true)}
                className="w-full gap-2 font-semibold text-sm mt-1"
                style={{ background: companion.color, color: '#000' }}
              >
                <Download className="size-4" />
                Deploy My AI
              </Button>
            </div>

            {/* Installed Skills */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <h3 className="font-heading font-bold text-sm">Installed Skills</h3>
                {installedSkills.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-auto">{installedSkills.length}</Badge>
                )}
              </div>
              {installedSkills.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <Bot className="size-8 text-muted-foreground opacity-40" />
                  <p className="text-xs text-muted-foreground">No skills installed yet.</p>
                  <p className="text-xs text-muted-foreground">Visit the Shop to add new capabilities.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {installedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl"
                      style={{ background: 'oklch(0.16 0.015 260)', border: `1px solid ${companion.color}15` }}
                    >
                      <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${companion.color}15` }}>
                        <Zap className="size-3.5" style={{ color: companion.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(skill.installed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="card-glass rounded-2xl flex flex-col" style={{ height: '620px', border: `1px solid ${companion.color}20` }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-border flex-shrink-0">
                <div
                  className="size-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${companion.color}15`, border: `1px solid ${companion.color}25` }}
                >
                  {companion.emoji}
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm" style={{ color: companion.color }}>{companion.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-400" />
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="size-2.5 mr-1" />Lv.{level}
                  </Badge>
                  <Badge className="text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
                    +8 XP / msg
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.map((msg, i) => msg.text === '' ? null : (
                  <div key={msg.id ?? i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'ai' && (
                      <div
                        className="size-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                        style={{ background: `${companion.color}15`, border: `1px solid ${companion.color}25` }}
                      >
                        {companion.emoji}
                      </div>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'text-black rounded-tr-sm' : 'text-foreground rounded-tl-sm'}`}
                      style={msg.role === 'user' ? { background: 'oklch(0.75 0.18 195)' } : { background: 'oklch(0.18 0.02 260)' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2.5">
                    <div
                      className="size-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1"
                      style={{ background: `${companion.color}15` }}
                    >
                      {companion.emoji}
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1" style={{ background: 'oklch(0.18 0.02 260)' }}>
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${companion.name}…`}
                    className="flex-1 text-sm"
                    style={{ background: 'oklch(0.16 0.015 260)', border: `1px solid ${companion.color}20` }}
                    disabled={isTyping}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    size="icon"
                    className="flex-shrink-0"
                    style={{ background: companion.color, color: '#000' }}
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Each message earns <span className="text-primary font-semibold">+8 XP</span> toward Level {level + 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeploy && companion && (
        <DeployModal
          companion={{ ...companion, level }}
          onClose={() => setShowDeploy(false)}
        />
      )}
    </div>
  )
}

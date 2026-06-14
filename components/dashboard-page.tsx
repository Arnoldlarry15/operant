"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { Send, Zap, Star, Trophy, Gift, MessageCircle, TrendingUp, Lock, Check, ArrowRight, Sparkles, Bot, LogIn, ShoppingBag, Package, Download } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { useAuth } from '@/components/auth-provider'
import {
  createFreeCompanion, getMessages, saveMessage,
  updateCompanionXP, completeMilestone as saveMilestone, getMilestones, getCompanions, getOrders,
} from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import Link from 'next/link'
import { DeployModal } from '@/components/deploy-modal'
type Message = { role: 'user' | 'ai'; text: string; id?: string }

const MILESTONES = [
  { id: 'first-10-messages', label: 'First 10 Chats', desc: 'Send 10 messages to your AI', xpReward: 50, icon: MessageCircle, threshold: 10 },
  { id: 'fifty-messages', label: '50 Message Club', desc: 'Keep the conversation going!', xpReward: 150, icon: TrendingUp, threshold: 50 },
  { id: 'hundred-messages', label: 'Century Chatter', desc: "100 messages — you're dedicated!", xpReward: 500, icon: Star, threshold: 100 },
  { id: 'share-platform', label: 'Spread the Word', desc: 'Share Operant with a friend', xpReward: 100, icon: Gift, threshold: 0 },
]

export function DashboardPage() {
  const { freeAI, initFreeAI, addNotification, setPage } = useAppState()
  const { user, loading: authLoading } = useAuth()

  // Companion DB state
  const [companionId, setCompanionId] = useState<string | null>(null)
  const [companionLevel, setCompanionLevel] = useState(1)
  const [companionXP, setCompanionXP] = useState(0)
  const [companionMessages, setCompanionMessages] = useState(0)

  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Milestones
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([])

  // Purchased companions
  type PurchasedCompanion = { id: string; name: string; color: string; emoji: string; level: number; xp: number; message_count: number; companion_type: string; trait: string }
  const [purchasedCompanions, setPurchasedCompanions] = useState<PurchasedCompanion[]>([])

  // Order history
  type Order = { id: string; items: { id: string; name: string; price: number; type: string }[]; total_cents: number; status: string; created_at: string }
  const [orders, setOrders] = useState<Order[]>([])
  const [showOrders, setShowOrders] = useState(false)

  // Deploy modal
  const [deployTarget, setDeployTarget] = useState<PurchasedCompanion | null>(null)

  // Once user is confirmed, ensure freeAI is set and sync to Supabase
  const initCompanion = useCallback(async () => {
    if (!user) return
    // Ensure freeAI personality is assigned (idempotent — no-ops if already set)
    initFreeAI()
    // Re-read from store after init
    const ai = useAppState.getState().freeAI
    if (!ai) return
    setChatLoading(true)

    // Create or fetch free companion
    const result = await createFreeCompanion({
      name: ai.name,
      color: ai.color,
      emoji: ai.emoji,
      trait: ai.trait,
    })

    if (result.data) {
      const c = result.data as { id: string; level: number; xp: number; message_count: number }
      setCompanionId(c.id)
      setCompanionLevel(c.level ?? 1)
      setCompanionXP(c.xp ?? 0)
      setCompanionMessages(c.message_count ?? 0)

      // Load persisted messages
      const msgs = await getMessages(c.id)
      if (msgs.length > 0) {
        setMessages(msgs.map((m: { id: string; role: 'user' | 'ai'; content: string }) => ({
          id: m.id,
          role: m.role,
          text: m.content,
        })))
      } else {
        // First time greeting
        const greeting = {
          role: 'ai' as const,
          text: `Hey there! I'm ${ai.name} — your free AI companion. I'm still growing, but I can already tell this is going to be a great friendship! What's on your mind?`,
        }
        setMessages([greeting])
        await saveMessage(c.id, 'ai', greeting.text)
      }

      // Load milestones
      const milestones = await getMilestones()
      setCompletedMilestones(milestones)
    }

    // Load purchased companions (prebuilt / custom only)
    const all = await getCompanions()
    const purchased = (all as PurchasedCompanion[]).filter((c) => c.companion_type !== 'free')
    setPurchasedCompanions(purchased)

    // Load order history
    const orderHistory = await getOrders()
    setOrders(orderHistory as Order[])

    setChatLoading(false)
  }, [user, initFreeAI])

  useEffect(() => {
    if (user) initCompanion()
  }, [user, initCompanion])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async () => {
    if (!input.trim() || !companionId || !freeAI || isTyping) return
    const userMsg = input.trim()
    setInput('')

    const newUserMsg: Message = { role: 'user', text: userMsg }
    setMessages((prev) => [...prev, newUserMsg])
    await saveMessage(companionId, 'user', userMsg)

    // Update XP
    const xpResult = await updateCompanionXP(companionId, 5)
    if (xpResult && 'xp' in xpResult) {
      setCompanionXP(xpResult.xp as number)
      setCompanionLevel(xpResult.level as number)
    }
    const newCount = companionMessages + 1
    setCompanionMessages(newCount)

    // Milestone checks
    if (newCount === 10 && !completedMilestones.includes('first-10-messages')) {
      await handleMilestone('first-10-messages', 50)
    }
    if (newCount === 50 && !completedMilestones.includes('fifty-messages')) {
      await handleMilestone('fifty-messages', 150)
    }
    if (newCount === 100 && !completedMilestones.includes('hundred-messages')) {
      await handleMilestone('hundred-messages', 500)
    }

    setIsTyping(true)

    // Build message history in ModelMessage format for the API
    const allMsgs = [...messages, newUserMsg]
    const modelMessages = allMsgs.map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }))

    // Placeholder for streaming response
    setMessages((prev) => [...prev, { role: 'ai', text: '' }])

    try {
      const res = await fetch('/api/chat/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: modelMessages,
          companionName: freeAI.name,
          companionTrait: freeAI.trait,
          companionLevel,
          messageCount: newCount,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

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

      if (fullText) await saveMessage(companionId, 'ai', fullText)
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'ai', text: "I ran into a hiccup — give me a moment and try again!" }
        return next
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleMilestone = async (id: string, xpReward: number) => {
    await saveMilestone(id, xpReward)
    setCompletedMilestones((prev) => [...prev, id])
    addNotification(`Milestone unlocked! +${xpReward} XP earned!`, 'success')
  }

  const handleShare = async () => {
    if (!completedMilestones.includes('share-platform')) {
      await handleMilestone('share-platform', 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const xpPerLevel = 100
  const currentLevelXP = companionXP % xpPerLevel
  const xpProgress = (currentLevelXP / xpPerLevel) * 100

  // Not logged in — prompt to sign up
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="size-20 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195 / 10%)', border: '2px solid oklch(0.75 0.18 195 / 20%)' }}>
            <Bot className="size-10 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground mb-2">Meet your free AI companion</h1>
            <p className="text-muted-foreground leading-relaxed">Create a free account to get your personally generated AI companion — no credit card required. Chat, level it up, and unlock milestones.</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button className="w-full font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }} render={<Link href="/auth/sign-up" />}>
              <Gift className="size-4" data-icon="inline-start" />
              Get Free AI Companion
            </Button>
            <Button variant="outline" className="w-full" render={<Link href="/auth/login" />}>
              <LogIn className="size-4" data-icon="inline-start" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // freeAI is initialised inside initCompanion; show skeleton until it resolves
  if (authLoading || chatLoading || !freeAI) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full animate-pulse" style={{ background: 'oklch(0.75 0.18 195 / 20%)' }} />
          <p className="text-muted-foreground text-sm">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Badge className="mb-3 text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', borderColor: 'oklch(0.75 0.18 195 / 30%)', color: 'oklch(0.82 0.2 195)' }}>
            <Gift className="size-3 mr-1" />
            Your Free AI Companion
          </Badge>
          <h1 className="font-heading font-bold text-3xl text-balance">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Chat with your AI, track milestones, and watch it evolve.</p>
        </div>

        {/* ── Purchased AI Companions ──────────────────────────────── */}
        {purchasedCompanions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Download className="size-4 text-primary" />
              <h2 className="font-heading font-bold text-lg">My AI Companions</h2>
              <Badge variant="secondary" className="text-xs">{purchasedCompanions.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchasedCompanions.map((c) => (
                <div
                  key={c.id}
                  className="card-glass rounded-2xl p-5 flex flex-col gap-4"
                  style={{ border: `1px solid ${c.color}30` }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="size-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: `${c.color}15`, border: `2px solid ${c.color}25` }}
                    >
                      {c.emoji || '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-base truncate" style={{ color: c.color }}>{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-xs py-0">Lv.{c.level}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{c.companion_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trait */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{c.trait}</p>

                  {/* Download / Deploy button */}
                  <Button
                    onClick={() => setDeployTarget(c)}
                    className="w-full font-semibold text-xs h-9 gap-2"
                    style={{ background: c.color, color: '#000' }}
                  >
                    <Download className="size-3.5" />
                    Deploy My AI
                  </Button>
                </div>
              ))}
            </div>
            <Separator className="mt-8" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: AI companion card + stats */}
          <div className="flex flex-col gap-4">
            {/* AI Card */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-4" style={{ border: `1px solid ${freeAI.color}25` }}>
              <div className="flex items-center gap-4">
                <div className="relative size-16 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: `${freeAI.color}15`, border: `2px solid ${freeAI.color}30` }}>
                  <Image src="/images/ai-free-companion.png" alt={freeAI.name} width={64} height={64} className="object-cover" />
                  <div className="absolute -bottom-1 -right-1 size-6 rounded-full flex items-center justify-center text-sm border-2" style={{ background: 'oklch(0.09 0.01 260)', borderColor: 'oklch(0.13 0.015 260)' }}>
                    {freeAI.emoji}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-heading font-bold text-xl" style={{ color: freeAI.color }}>{freeAI.name}</h2>
                    <Badge variant="secondary" className="text-xs">Lv.{companionLevel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{freeAI.trait}</p>
                  <Badge className="mt-1 text-xs py-0" style={{ background: 'oklch(0.75 0.18 195 / 10%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
                    <Gift className="size-2.5 mr-1" />Free Companion
                  </Badge>
                </div>
              </div>

              {/* XP Bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">XP Progress</span>
                  <span className="text-xs font-semibold text-primary">{currentLevelXP} / {xpPerLevel} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{xpPerLevel - currentLevelXP} XP until Level {companionLevel + 1}</p>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-heading font-bold text-lg" style={{ color: freeAI.color }}>{companionLevel}</p>
                  <p className="text-xs text-muted-foreground">Level</p>
                </div>
                <div>
                  <p className="font-heading font-bold text-lg text-primary">{companionMessages}</p>
                  <p className="text-xs text-muted-foreground">Chats</p>
                </div>
                <div>
                  <p className="font-heading font-bold text-lg text-primary">{companionXP}</p>
                  <p className="text-xs text-muted-foreground">Total XP</p>
                </div>
              </div>

              <div className="p-3 rounded-xl text-xs" style={{ background: 'oklch(0.16 0.015 260)' }}>
                <p className="text-muted-foreground"><span className="text-foreground font-semibold">Free companions evolve</span> through chat milestones and community actions — not purchases. Keep chatting!</p>
              </div>
            </div>

            {/* Milestones */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <h3 className="font-heading font-bold text-sm">Milestones</h3>
              </div>
              <div className="flex flex-col gap-3">
                {MILESTONES.map((m) => {
                  const isComplete = completedMilestones.includes(m.id)
                  const isShareMilestone = m.id === 'share-platform'
                  const progress = m.threshold > 0 ? Math.min(companionMessages / m.threshold * 100, 100) : (isComplete ? 100 : 0)
                  return (
                    <div key={m.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`size-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isComplete ? '' : 'opacity-50'}`} style={{ background: isComplete ? 'oklch(0.75 0.18 195 / 15%)' : 'oklch(0.18 0.02 260)' }}>
                          {isComplete ? <Check className="size-3.5 text-primary" /> : m.threshold > 0 ? <m.icon className="size-3.5 text-muted-foreground" /> : <Lock className="size-3 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>{m.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
                        </div>
                        <span className="text-xs font-semibold text-primary flex-shrink-0">+{m.xpReward} XP</span>
                      </div>
                      {m.threshold > 0 && !isComplete && <Progress value={progress} className="h-1" />}
                      {isShareMilestone && !isComplete && (
                        <button onClick={handleShare} className="text-xs text-primary underline text-left ml-9">
                          Click to complete
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-3" style={{ border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-heading font-bold text-sm">Want More?</h3>
              </div>
              <p className="text-xs text-muted-foreground">Build a custom AI or grab a pre-built companion with advanced skills and unlimited upgrades.</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => setPage('builder')} className="w-full text-xs font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}>
                  <Bot className="size-3.5" data-icon="inline-start" />Build Custom AI
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage('prebuilt')} className="w-full text-xs">
                  Browse Pre-built AIs <ArrowRight className="size-3.5" data-icon="inline-end" />
                </Button>
              </div>
            </div>
            {/* Order History */}
            {orders.length > 0 && (
              <div className="card-glass rounded-2xl p-5 flex flex-col gap-3">
                <button
                  className="flex items-center gap-2 w-full text-left"
                  onClick={() => setShowOrders((v) => !v)}
                >
                  <ShoppingBag className="size-4 text-primary" />
                  <h3 className="font-heading font-bold text-sm flex-1">Order History</h3>
                  <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
                  <ArrowRight className={`size-3.5 text-muted-foreground transition-transform ${showOrders ? 'rotate-90' : ''}`} />
                </button>
                {showOrders && (
                  <div className="flex flex-col gap-2">
                    {orders.map((order) => (
                      <div key={order.id} className="p-3 rounded-xl flex flex-col gap-1.5" style={{ background: 'oklch(0.13 0.015 260)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="size-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-primary">${(order.total_cents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 ml-5">
                          {order.items.map((item, i) => (
                            <span key={i} className="text-xs text-muted-foreground truncate">{item.name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="card-glass rounded-2xl flex flex-col" style={{ height: '600px', border: `1px solid ${freeAI.color}15` }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="relative size-9 rounded-xl overflow-hidden" style={{ background: `${freeAI.color}15` }}>
                  <Image src="/images/ai-free-companion.png" alt={freeAI.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm" style={{ color: freeAI.color }}>{freeAI.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-400" />
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="size-2.5 mr-1" />Lv.{companionLevel}
                  </Badge>
                  <Badge className="text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
                    +5 XP per message
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
                {messages.map((msg, i) => msg.text === '' ? null : (
                  <div key={msg.id ?? i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'ai' && (
                      <div className="size-7 rounded-xl overflow-hidden flex-shrink-0 mt-1" style={{ background: `${freeAI.color}15` }}>
                        <Image src="/images/ai-free-companion.png" alt={freeAI.name} width={28} height={28} className="object-cover" />
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
                {isTyping && messages[messages.length - 1]?.text === '' && (
                  <div className="flex gap-2.5">
                    <div className="size-7 rounded-xl overflow-hidden flex-shrink-0 mt-1" style={{ background: `${freeAI.color}15` }}>
                      <Image src="/images/ai-free-companion.png" alt={freeAI.name} width={28} height={28} className="object-cover" />
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
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${freeAI.name}…`}
                    className="flex-1 bg-muted/50 border-border focus-visible:ring-primary/30 text-sm"
                    disabled={!companionId}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping || !companionId}
                    size="sm"
                    className="px-3 font-semibold"
                    style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {freeAI.name} earns XP with every message. {companionMessages} messages sent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Modal */}
      {deployTarget && (
        <DeployModal
          companion={deployTarget}
          onClose={() => setDeployTarget(null)}
        />
      )}
    </div>
  )
}

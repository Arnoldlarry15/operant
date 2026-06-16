"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, Gift, LogIn, MessageCircle, Package, Send, ShoppingBag, Sparkles } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { useAuth } from '@/components/auth-provider'
import { getCompanions, getOrders, getPendingSkills } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { AssignSkillModal } from '@/components/assign-skill-modal'

type Message = { role: 'user' | 'ai'; text: string; id?: string }
type Agent = {
  id: string
  name: string
  color: string
  emoji: string
  level: number
  xp: number
  message_count: number
  companion_type: string
  trait: string
}
type Order = {
  id: string
  items: { id: string; name: string; price: number; type: string }[]
  total_cents: number
  status: string
  created_at: string
}
type PendingSkill = { id: string; skill_id: string; skill_name: string; created_at: string }

const SUPPORT_AGENT = {
  name: 'Operant Guide',
  color: '#22d3ee',
  trait: 'Customer support and agent-building guidance',
}

function orderStatusTone(status: string) {
  if (status === 'completed') return { label: 'Completed', color: '#4ade80' }
  if (status === 'pending') return { label: 'Pending', color: '#fbbf24' }
  if (status === 'failed') return { label: 'Failed', color: '#fb7185' }
  if (status === 'refunded') return { label: 'Refunded', color: '#94a3b8' }
  return { label: status, color: '#94a3b8' }
}

export function DashboardPage() {
  const { addNotification, setPage } = useAppState()
  const { user, loading: authLoading } = useAuth()

  const [agents, setAgents] = useState<Agent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pendingSkills, setPendingSkills] = useState<PendingSkill[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Hi, I am Operant Guide. I can help you choose a pre-built agent, plan a custom build, understand upgrades, or troubleshoot checkout and dashboard access.',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadDashboard = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [allAgents, orderHistory, pending] = await Promise.all([
      getCompanions(),
      getOrders(),
      getPendingSkills(),
    ])

    setAgents(allAgents as Agent[])
    setOrders(orderHistory as Order[])
    setPendingSkills(pending as PendingSkill[])
    if ((pending as PendingSkill[]).length > 0) setShowAssignModal(true)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) loadDashboard()
  }, [user, loadDashboard])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function handleSend() {
    if (!input.trim() || isTyping) return
    const userMsg = input.trim()
    setInput('')

    const newUserMsg: Message = { role: 'user', text: userMsg }
    const nextMessages = [...messages, newUserMsg]
    setMessages([...nextMessages, { role: 'ai', text: '' }])
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text,
          })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const delta = decoder.decode(value, { stream: true })
        if (!delta) continue
        fullText += delta
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'ai', text: fullText }
          return copy
        })
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'ai', text: 'I had trouble connecting. Try again in a moment, or contact support if it keeps happening.' }
        return copy
      })
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="size-20 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195 / 10%)', border: '2px solid oklch(0.75 0.18 195 / 20%)' }}>
            <Bot className="size-10 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground mb-2">Manage your AI agents</h1>
            <p className="text-muted-foreground leading-relaxed">Create an account to buy, build, upgrade, and chat with Operant agents.</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button className="w-full font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }} render={<Link href="/auth/sign-up" />}>
              <Gift className="size-4" data-icon="inline-start" />
              Create Account
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-full animate-pulse" style={{ background: 'oklch(0.75 0.18 195 / 20%)' }} />
          <p className="text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Badge className="mb-3 text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', borderColor: 'oklch(0.75 0.18 195 / 30%)', color: 'oklch(0.82 0.2 195)' }}>
            <Sparkles className="size-3 mr-1" />
            Agent Command Center
          </Badge>
          <h1 className="font-heading font-bold text-3xl text-balance">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage purchased agents, assign upgrades, and get setup guidance.</p>
        </div>

        {agents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="size-4 text-primary" />
              <h2 className="font-heading font-bold text-lg">My AI Agents</h2>
              <Badge variant="secondary" className="text-xs">{agents.length}</Badge>
              {pendingSkills.length > 0 && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'oklch(0.75 0.18 195 / 15%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 30%)' }}
                >
                  <span className="size-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
                    {pendingSkills.length}
                  </span>
                  Upgrades to assign
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="card-glass rounded-2xl p-5 flex flex-col gap-4" style={{ border: `1px solid ${agent.color}30` }}>
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: `${agent.color}15`, border: `2px solid ${agent.color}25` }}>
                      {agent.emoji || 'AI'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-base truncate" style={{ color: agent.color }}>{agent.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-xs py-0">Lv.{agent.level}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{agent.companion_type} agent</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{agent.trait}</p>
                  <div>
                    <Button size="sm" className="w-full text-xs font-semibold" style={{ background: agent.color, color: '#000' }} onClick={() => { window.location.href = `/companion/${agent.id}` }}>
                      <MessageCircle className="size-3.5" />
                      Open Agent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="mt-8" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-4">
            <div className="card-glass rounded-2xl p-5 flex flex-col gap-4" style={{ border: `1px solid ${SUPPORT_AGENT.color}25` }}>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl flex items-center justify-center" style={{ background: `${SUPPORT_AGENT.color}15`, border: `1px solid ${SUPPORT_AGENT.color}30` }}>
                  <Bot className="size-6" style={{ color: SUPPORT_AGENT.color }} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg" style={{ color: SUPPORT_AGENT.color }}>{SUPPORT_AGENT.name}</h2>
                  <p className="text-xs text-muted-foreground">Embedded support and guidance</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This bot helps customers navigate the store, choose agent builds, assign upgrades, and troubleshoot checkout or dashboard access. It is not a sellable agent.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => setPage('builder')} className="text-xs font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}>
                  <Bot className="size-3.5" />
                  Build Agent
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage('prebuilt')} className="text-xs">
                  Browse Agents
                </Button>
              </div>
            </div>

            <div className="card-glass rounded-2xl p-5 flex flex-col gap-3" style={{ border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-heading font-bold text-sm">Need an Agent?</h3>
              </div>
              <p className="text-xs text-muted-foreground">Build a custom AI agent or grab a pre-built agent with advanced skills and upgrade paths.</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => setPage('builder')} className="w-full text-xs font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}>
                  <Bot className="size-3.5" data-icon="inline-start" />Build Custom Agent
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage('prebuilt')} className="w-full text-xs">
                  Browse Pre-built Agents <ArrowRight className="size-3.5" data-icon="inline-end" />
                </Button>
              </div>
            </div>

            {orders.length > 0 && (
              <div className="card-glass rounded-2xl p-5 flex flex-col gap-3">
                <button className="flex items-center gap-2 w-full text-left" onClick={() => setShowOrders((v) => !v)}>
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
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-xs"
                              style={{
                                background: `${orderStatusTone(order.status).color}15`,
                                color: orderStatusTone(order.status).color,
                                border: `1px solid ${orderStatusTone(order.status).color}30`,
                              }}
                            >
                              {orderStatusTone(order.status).label}
                            </Badge>
                            <span className="text-xs font-bold text-primary">${(order.total_cents / 100).toFixed(2)}</span>
                          </div>
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

          <div className="lg:col-span-2 flex flex-col">
            <div className="card-glass rounded-2xl flex flex-col" style={{ height: '600px', border: `1px solid ${SUPPORT_AGENT.color}20` }}>
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: `${SUPPORT_AGENT.color}15` }}>
                  <Bot className="size-5" style={{ color: SUPPORT_AGENT.color }} />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm" style={{ color: SUPPORT_AGENT.color }}>{SUPPORT_AGENT.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-emerald-400" />
                    <p className="text-xs text-muted-foreground">Support online</p>
                  </div>
                </div>
                <Badge className="ml-auto text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', color: 'oklch(0.82 0.2 195)', border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
                  Guidance bot
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
                {messages.map((msg, i) => msg.text === '' ? null : (
                  <div key={msg.id ?? i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'ai' && (
                      <div className="size-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${SUPPORT_AGENT.color}15` }}>
                        <Bot className="size-4" style={{ color: SUPPORT_AGENT.color }} />
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
                    <div className="size-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${SUPPORT_AGENT.color}15` }}>
                      <Bot className="size-4" style={{ color: SUPPORT_AGENT.color }} />
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1" style={{ background: 'oklch(0.18 0.02 260)' }}>
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about agents, upgrades, checkout, or dashboard access..."
                    className="flex-1 bg-muted/50 border-border focus-visible:ring-primary/30 text-sm"
                  />
                  <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="sm" className="px-3 font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}>
                    <Send className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Support chats are for guidance only. Purchased agents stay in your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignSkillModal
          pendingSkills={pendingSkills}
          companions={agents}
          onClose={() => setShowAssignModal(false)}
          onAssigned={(id) => {
            setPendingSkills((prev) => prev.filter((skill) => skill.id !== id))
            addNotification('Upgrade assigned to agent.', 'success')
          }}
        />
      )}
    </div>
  )
}

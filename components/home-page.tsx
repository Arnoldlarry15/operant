"use client"

import { Bot, Zap, Star, ShoppingBag, ArrowRight, Sparkles, Shield, TrendingUp, Users, ChevronRight } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { prebuiltAIs } from '@/lib/store-data'
import Image from 'next/image'
import { OperantLogo } from '@/components/operant-logo'

export function HomePage() {
  const { setPage } = useAppState()

  const features = [
    {
      icon: Bot,
      title: 'Build From Scratch',
      description: 'Pick your AI\'s personality, core power, appearance, and skills - one click at a time.',
      color: '#22d3ee',
      action: () => setPage('builder'),
      cta: 'Start Building',
    },
    {
      icon: Sparkles,
      title: 'Ready-Made AIs',
      description: '5 pre-configured agents with curated operating styles and skill sets. Ready to go instantly.',
      color: '#a855f7',
      action: () => setPage('prebuilt'),
      cta: 'Browse AIs',
    },
    {
      icon: ShoppingBag,
      title: 'Upgrade Anytime',
      description: 'New skills, looks, and tools drop regularly. Your AI grows as you do.',
      color: '#fb923c',
      action: () => setPage('shop'),
      cta: 'Visit Shop',
    },
    {
      icon: Shield,
      title: 'Guided Setup',
      description: 'Use the embedded support bot to choose agents, understand upgrades, and find your purchased agents.',
      color: '#4ade80',
      action: () => setPage('dashboard'),
      cta: 'Meet Yours',
    },
  ]

  const stats = [
    { label: 'AI Agents Built', value: '0', icon: Bot },
    { label: 'Skills Available', value: '0', icon: Zap },
    { label: 'Happy Users', value: '0', icon: Users },
    { label: 'Avg Rating', value: '0', icon: Star },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/hero-bg.png"
            alt=""
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.75 0.18 195 / 8%) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6">
          <Badge className="text-xs font-semibold px-3 py-1.5 border" style={{ background: 'oklch(0.75 0.18 195 / 10%)', borderColor: 'oklch(0.75 0.18 195 / 30%)', color: 'oklch(0.82 0.2 195)' }}>
            <Zap className="size-3 mr-1" />
            Build, buy, and upgrade AI agents
          </Badge>

          <h1 className="font-heading font-bold text-5xl md:text-7xl leading-tight tracking-tight text-balance">
            Build the AI{' '}
            <span className="text-gradient">You&apos;ve Always</span>
            <br />
            Wanted
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed text-pretty">
            Design your perfect AI agent from the ground up: choose its personality, power, look, and skills. No code required. No technical knowledge needed. Just you and your imagination.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Button
              onClick={() => setPage('builder')}
              size="lg"
              className="px-8 py-3 text-base font-bold rounded-xl glow-cyan transition-all hover:scale-105"
              style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
            >
              <Bot className="size-5" data-icon="inline-start" />
              Build Your AI
            </Button>
            <Button
              onClick={() => setPage('prebuilt')}
              variant="outline"
              size="lg"
              className="px-8 py-3 text-base font-medium rounded-xl border-border hover:bg-accent"
            >
              See Prebuilt Agents
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">Sign up to build, buy, and chat with agents</p>
        </div>

        {/* Floating AI cards */}
        <div className="relative z-10 mt-16 w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
          {prebuiltAIs.slice(0, 3).map((ai) => (
            <button
              key={ai.id}
              onClick={() => setPage('prebuilt')}
              className="card-glass card-glass-hover rounded-2xl p-4 text-left flex flex-col gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl overflow-hidden" style={{ border: `2px solid ${ai.color}30` }}>
                  <Image src={ai.image} alt={ai.name} width={48} height={48} className="object-cover size-full" />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm" style={{ color: ai.color }}>{ai.name}</p>
                  <p className="text-xs text-muted-foreground">{ai.tagline}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{ai.skills.length} skills</span>
                <span className="text-sm font-bold" style={{ color: ai.color }}>${ai.price}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50">
          <p className="text-xs uppercase tracking-widest">Scroll to explore</p>
          <div className="w-px h-8 bg-muted-foreground/20" />
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4" style={{ background: 'oklch(0.11 0.015 260)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <stat.icon className="size-5 text-primary mb-1" />
              <span className="font-heading font-bold text-3xl text-gradient">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', borderColor: 'oklch(0.75 0.18 195 / 30%)', color: 'oklch(0.82 0.2 195)' }}>
              Simple as 1-2-3
            </Badge>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-balance">
              Your AI, Built <span className="text-gradient">Your Way</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-pretty">
              Building your AI agent takes less than 5 minutes. No technical skills needed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Choose a Personality', desc: 'Pick how your AI thinks, speaks, and behaves. From analytical to creative, there\'s a personality for everyone.', color: '#22d3ee' },
              { step: '02', title: 'Add Skills & Tools', desc: 'Select the abilities your AI needs. Web search, coding help, fitness coaching - mix and match freely.', color: '#a855f7' },
              { step: '03', title: 'Meet Your AI', desc: 'Your agent is ready instantly in your dashboard. Chat with it and upgrade it when you need more capability.', color: '#fb923c' },
            ].map((item) => (
              <div key={item.step} className="card-glass card-glass-hover rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="font-heading font-bold text-5xl opacity-10 absolute top-4 right-4" style={{ color: item.color }}>
                  {item.step}
                </div>
                <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <span className="font-heading font-bold text-sm" style={{ color: item.color }}>{item.step}</span>
                </div>
                <h3 className="font-heading font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20 px-4" style={{ background: 'oklch(0.11 0.015 260)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-balance">
              Everything You Need in <span className="text-gradient">One Place</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card-glass card-glass-hover rounded-2xl p-6 flex flex-col gap-4 group">
                <div className="size-12 rounded-2xl flex items-center justify-center" style={{ background: `${f.color}15` }}>
                  <f.icon className="size-6" style={{ color: f.color }} />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-heading font-bold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
                <button
                  onClick={f.action}
                  className="mt-auto flex items-center gap-2 text-sm font-semibold transition-all group-hover:gap-3"
                  style={{ color: f.color }}
                >
                  {f.cta}
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-built AI showcase */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-heading font-bold text-3xl text-balance">
                Meet Our <span className="text-gradient">Signature AIs</span>
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">Hand-crafted agents ready to go</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPage('prebuilt')} className="hidden md:flex">
              View All
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {prebuiltAIs.slice(0, 3).map((ai) => (
              <button
                key={ai.id}
                onClick={() => setPage('prebuilt')}
                className="card-glass card-glass-hover rounded-2xl overflow-hidden text-left flex flex-col"
              >
                <div className="relative h-48 overflow-hidden" style={{ background: `radial-gradient(circle at 50% 80%, ${ai.color}20, transparent 70%)` }}>
                  <Image src={ai.image} alt={ai.name} fill className="object-cover object-top opacity-90" />
                  <div className="absolute top-3 left-3">
                    <Badge className="text-xs font-semibold" style={{ background: `${ai.color}20`, borderColor: `${ai.color}40`, color: ai.color }}>
                      {ai.badge}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-base" style={{ color: ai.color }}>{ai.name}</h3>
                    <span className="text-sm font-bold text-foreground">${ai.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ai.tagline}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ai.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs py-0 px-2">{skill}</Badge>
                    ))}
                    {ai.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs py-0 px-2">+{ai.skills.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-center mt-6 md:hidden">
            <Button variant="outline" onClick={() => setPage('prebuilt')}>
              View All Prebuilt Agents
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4" style={{ background: 'oklch(0.11 0.015 260)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="card-glass rounded-3xl p-8 md:p-12 relative overflow-hidden" style={{ border: '1px solid oklch(0.75 0.18 195 / 20%)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, oklch(0.75 0.18 195 / 6%), transparent)' }} />
            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="size-16 rounded-2xl flex items-center justify-center glow-cyan" style={{ background: 'oklch(0.75 0.18 195 / 15%)' }}>
                <Bot className="size-8 text-primary" />
              </div>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-balance">
                Your Next AI Agent is Waiting
              </h2>
              <p className="text-muted-foreground max-w-lg text-pretty">
                Build a custom agent from scratch or start with a pre-built agent and upgrade it with paid skills when you need more capability.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setPage('dashboard')}
                  size="lg"
                  className="px-8 font-bold glow-cyan"
                  style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                >
                  <TrendingUp className="size-5" data-icon="inline-start" />
                  View My Agents
                </Button>
                <Button
                  onClick={() => setPage('builder')}
                  variant="outline"
                  size="lg"
                  className="px-8"
                >
                  Build a Custom AI
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <OperantLogo size={24} />
            <span className="font-heading font-bold text-gradient">Operant</span>
          </div>
          <p className="text-xs text-muted-foreground">Build the AI you&apos;ve always wanted. &copy; 2025 Operant Inc.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer">Privacy</span>
            <span className="hover:text-foreground cursor-pointer">Terms</span>
            <span className="hover:text-foreground cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

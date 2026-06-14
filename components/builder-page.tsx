"use client"

import { useState } from 'react'
import { Check, ChevronRight, ChevronLeft, Zap, Bot, Sparkles, ShoppingCart, Info } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { personalities, cores, appearances, skills } from '@/lib/store-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const STEPS = ['Personality', 'Core Power', 'Appearance', 'Skills', 'Review']

export function BuilderPage() {
  const { builder, setPersonality, setCore, setAppearance, toggleSkill, addToCart, addNotification } = useAppState()
  const [step, setStep] = useState(0)

  const selectedPersonality = personalities.find((p) => p.id === builder.selectedPersonality)
  const selectedCore = cores.find((c) => c.id === builder.selectedCore)
  const selectedAppearance = appearances.find((a) => a.id === builder.selectedAppearance)
  const selectedSkillsList = skills.filter((s) => builder.selectedSkills.includes(s.id))

  const totalPrice =
    (selectedPersonality?.price ?? 0) +
    (selectedCore?.price ?? 0) +
    (selectedAppearance?.price ?? 0) +
    selectedSkillsList.reduce((sum, s) => sum + s.price, 0)

  const canNext = () => {
    if (step === 0) return !!builder.selectedPersonality
    if (step === 1) return !!builder.selectedCore
    if (step === 2) return !!builder.selectedAppearance
    if (step === 3) return true
    return true
  }

  const handleBuild = () => {
    addToCart({
      id: `custom-${Date.now()}`,
      name: `Custom AI (${selectedPersonality?.name ?? 'Unknown'})`,
      price: totalPrice,
      type: 'custom',
        companionMeta: {
          companion_type: 'custom',
          personality_id: builder.selectedPersonality ?? undefined,
          core_id: builder.selectedCore ?? undefined,
          appearance_id: builder.selectedAppearance ?? undefined,
          color: selectedPersonality?.color ?? '#22d3ee',
          emoji: '⚡',
          trait: selectedPersonality?.traits?.[0] ?? 'Helpful and curious',
        },
    })
    addNotification('Your custom AI has been added to cart!', 'success')
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 text-xs" style={{ background: 'oklch(0.75 0.18 195 / 10%)', borderColor: 'oklch(0.75 0.18 195 / 30%)', color: 'oklch(0.82 0.2 195)' }}>
            <Bot className="size-3 mr-1" />
            Custom AI Builder
          </Badge>
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-balance">
            Build Your Perfect <span className="text-gradient">AI Companion</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Pick each component step by step. No technical knowledge needed.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => i < step || canNext() ? setStep(i) : null}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all',
                  i <= step ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div className={cn(
                  'size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  i < step ? 'text-black' : i === step ? 'text-black glow-cyan' : 'bg-muted text-muted-foreground'
                )} style={i <= step ? { background: 'oklch(0.75 0.18 195)' } : {}}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </div>
                <span className={cn('text-xs hidden sm:block', i === step ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {s}
                </span>
              </button>
            ))}
          </div>
          <Progress value={(step / (STEPS.length - 1)) * 100} className="h-1" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main step content */}
          <div className="md:col-span-2">
            {/* Step 0: Personality */}
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-heading font-bold text-xl">Choose a Personality</h2>
                <p className="text-sm text-muted-foreground">This shapes how your AI thinks, speaks, and behaves with you.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {personalities.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPersonality(p.id)}
                      className={cn(
                        'card-glass rounded-2xl p-4 text-left flex flex-col gap-3 transition-all duration-200 border',
                        builder.selectedPersonality === p.id
                          ? 'border-primary/50 shadow-lg'
                          : 'border-transparent hover:border-border'
                      )}
                      style={builder.selectedPersonality === p.id ? { boxShadow: `0 0 20px ${p.color}25` } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: `${p.color}15` }}>
                          <Bot className="size-5" style={{ color: p.color }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {p.price === 0 ? (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          ) : (
                            <span className="text-sm font-bold" style={{ color: p.color }}>${p.price}</span>
                          )}
                          {builder.selectedPersonality === p.id && (
                            <div className="size-5 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195)' }}>
                              <Check className="size-3 text-black" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-heading font-bold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.traits.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${p.color}10`, color: p.color }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Core */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-heading font-bold text-xl">Choose Core Power</h2>
                <p className="text-sm text-muted-foreground">The core determines your AI&apos;s processing power, speed, and capability level.</p>
                <div className="flex flex-col gap-3">
                  {cores.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCore(c.id)}
                      className={cn(
                        'card-glass rounded-2xl p-4 text-left flex items-center gap-4 transition-all border',
                        builder.selectedCore === c.id ? 'border-primary/50' : 'border-transparent hover:border-border'
                      )}
                    >
                      <div className="size-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.75 0.18 195 / 10%)' }}>
                        <Zap className="size-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-bold text-sm">{c.name}</span>
                          <Badge variant="secondary" className="text-xs">{c.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                        <div className="flex gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">Power: <span className="text-primary font-semibold">{c.power}</span></span>
                          <span className="text-xs text-muted-foreground">Speed: <span className="text-primary font-semibold">{c.speed}</span></span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {c.price === 0 ? (
                          <Badge className="text-xs" style={{ background: 'oklch(0.75 0.18 195 / 15%)', color: 'oklch(0.82 0.2 195)' }}>Free</Badge>
                        ) : (
                          <span className="text-base font-bold text-primary">${c.price}</span>
                        )}
                        {builder.selectedCore === c.id && (
                          <div className="size-5 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195)' }}>
                            <Check className="size-3 text-black" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Appearance */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-xl">Choose Appearance</h2>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="size-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-48">This can only be changed again by purchasing an Appearance Reset from the Shop.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">Pick your AI&apos;s visual style. Choose carefully — you can only change this by paying a reset fee later.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {appearances.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAppearance(a.id)}
                      className={cn(
                        'card-glass rounded-2xl p-4 text-left flex flex-col gap-3 transition-all border',
                        builder.selectedAppearance === a.id ? 'border-primary/50' : 'border-transparent hover:border-border'
                      )}
                      style={builder.selectedAppearance === a.id ? { boxShadow: `0 0 20px ${a.color}25` } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="size-10 rounded-xl" style={{ background: `${a.color}20`, border: `2px solid ${a.color}30` }}>
                          <div className="size-full rounded-xl" style={{ background: `radial-gradient(circle at 30% 30%, ${a.color}50, ${a.color}10)` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {a.price === 0 ? (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          ) : (
                            <span className="text-sm font-bold" style={{ color: a.color }}>${a.price}</span>
                          )}
                          {builder.selectedAppearance === a.id && (
                            <div className="size-5 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.75 0.18 195)' }}>
                              <Check className="size-3 text-black" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-heading font-bold text-sm">{a.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                        <p className="text-xs mt-1" style={{ color: a.color }}>{a.style}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Skills */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-heading font-bold text-xl">Add Skills</h2>
                <p className="text-sm text-muted-foreground">Select what your AI can do. You can add more skills anytime from the Shop.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {skills.map((s) => {
                    const isSelected = builder.selectedSkills.includes(s.id)
                    const tierColors = { basic: '#22d3ee', pro: '#a855f7', elite: '#f59e0b' }
                    const color = tierColors[s.tier]
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSkill(s.id)}
                        className={cn(
                          'card-glass rounded-xl p-3 text-left flex items-center gap-3 transition-all border',
                          isSelected ? 'border-primary/40' : 'border-transparent hover:border-border'
                        )}
                      >
                        <div className="size-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                          <Sparkles className="size-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs font-bold" style={{ color }}>${s.price}</span>
                          <Badge className="text-xs py-0" style={{ background: `${color}10`, color, border: `1px solid ${color}30` }}>
                            {s.tier}
                          </Badge>
                        </div>
                        {isSelected && (
                          <div className="size-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'oklch(0.75 0.18 195)' }}>
                            <Check className="size-3 text-black" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                <h2 className="font-heading font-bold text-xl">Review Your AI</h2>
                <p className="text-sm text-muted-foreground">Here&apos;s what you&apos;ve built. Everything looks good? Add it to cart and check out!</p>
                <div className="card-glass rounded-2xl p-6 flex flex-col gap-5">
                  {/* Summary rows */}
                  {[
                    { label: 'Personality', value: selectedPersonality?.name, price: selectedPersonality?.price, color: '#22d3ee' },
                    { label: 'Core Power', value: selectedCore?.name, price: selectedCore?.price, color: '#a855f7' },
                    { label: 'Appearance', value: selectedAppearance?.label, price: selectedAppearance?.price, color: '#fb923c' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="text-sm font-semibold" style={{ color: row.color }}>{row.value ?? 'Not selected'}</p>
                      </div>
                      <span className="text-sm font-bold">{row.price === 0 ? 'Free' : `$${row.price}`}</span>
                    </div>
                  ))}
                  <div className="flex items-start justify-between py-2 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Skills</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSkillsList.length > 0 ? selectedSkillsList.map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                        )) : <span className="text-sm text-muted-foreground">No skills selected</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold">${selectedSkillsList.reduce((sum, s) => sum + s.price, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-heading font-bold text-lg">Total</span>
                    <span className="font-heading font-bold text-2xl text-gradient">${totalPrice}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleBuild}
                    size="lg"
                    className="w-full font-bold glow-cyan"
                    style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                    disabled={!selectedPersonality || !selectedCore || !selectedAppearance}
                  >
                    <ShoppingCart className="size-5" data-icon="inline-start" />
                    Add to Cart — ${totalPrice}
                  </Button>
                  {(!selectedPersonality || !selectedCore || !selectedAppearance) && (
                    <p className="text-xs text-muted-foreground text-center">Please complete all required steps (personality, core, appearance) first.</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="gap-2"
              >
                <ChevronLeft className="size-4" data-icon="inline-start" />
                Back
              </Button>
              {step < STEPS.length - 1 && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                  className="gap-2 font-semibold"
                >
                  Continue
                  <ChevronRight className="size-4" data-icon="inline-end" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar summary */}
          <div className="hidden md:flex flex-col gap-4">
            <div className="card-glass rounded-2xl p-5 sticky top-24">
              <h3 className="font-heading font-bold text-sm mb-4 text-muted-foreground uppercase tracking-widest">Your Build</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Personality', value: selectedPersonality?.name, color: '#22d3ee' },
                  { label: 'Core', value: selectedCore?.name, color: '#a855f7' },
                  { label: 'Appearance', value: selectedAppearance?.label, color: '#fb923c' },
                  { label: 'Skills', value: selectedSkillsList.length > 0 ? `${selectedSkillsList.length} selected` : null, color: '#4ade80' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-semibold" style={{ color: row.value ? row.color : 'oklch(0.45 0.02 260)' }}>
                      {row.value ?? 'Not selected'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border mt-4 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Total</span>
                  <span className="font-heading font-bold text-xl text-gradient">${totalPrice}</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl text-xs text-muted-foreground" style={{ background: 'oklch(0.16 0.015 260)' }}>
                <p className="font-semibold text-foreground mb-1">Reminder</p>
                <p>Appearance can only be changed later with a paid reset. Choose wisely!</p>
              </div>

              {/* Preview image */}
              <div className="mt-4 relative h-40 rounded-xl overflow-hidden" style={{ background: 'oklch(0.11 0.015 260)' }}>
                <Image src="/images/builder-preview.png" alt="AI Being Built" fill className="object-cover opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center">Your AI takes shape as you build</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from 'react'
import { ShoppingCart, Check, Sparkles, Zap, ArrowRight, Star } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { prebuiltAIs } from '@/lib/store-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'

export function PrebuiltPage() {
  const { addToCart, cart, addNotification } = useAppState()
  const [selectedAI, setSelectedAI] = useState<typeof prebuiltAIs[0] | null>(null)

  const isInCart = (id: string) => cart.some((c) => c.id === `prebuilt-${id}`)

  const handleAddToCart = (ai: typeof prebuiltAIs[0]) => {
    if (!isInCart(ai.id)) {
      addToCart({
        id: `prebuilt-${ai.id}`,
        name: ai.name,
        price: ai.price,
        type: 'prebuilt',
        companionMeta: {
          companion_type: 'prebuilt',
          prebuilt_id: ai.id,
          color: ai.color,
          emoji: '🤖',
          trait: ai.tagline,
        },
      })
      addNotification(`${ai.name} added to cart!`, 'success')
    }
  }

  const tierColors: Record<string, string> = {
    standard: '#22d3ee',
    premium: '#a855f7',
    elite: '#f59e0b',
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 text-xs" style={{ background: 'oklch(0.68 0.18 280 / 10%)', borderColor: 'oklch(0.68 0.18 280 / 30%)', color: 'oklch(0.75 0.18 280)' }}>
            <Sparkles className="size-3 mr-1" />
            5 Signature Companions
          </Badge>
          <h1 className="font-heading font-bold text-3xl md:text-5xl text-balance">
            Meet Your Next <span className="text-gradient">AI Companion</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-pretty">
            Each pre-built AI is a carefully crafted companion with a distinct personality, curated skills, and its own identity. Ready to deploy the moment you buy.
          </p>
        </div>

        {/* AI Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prebuiltAIs.map((ai) => {
            const inCart = isInCart(ai.id)
            return (
              <div
                key={ai.id}
                className="card-glass card-glass-hover rounded-2xl overflow-hidden flex flex-col group"
                style={{ border: `1px solid ${ai.color}15` }}
              >
                {/* Image */}
                <div
                  className="relative h-52 overflow-hidden cursor-pointer"
                  onClick={() => setSelectedAI(ai)}
                  style={{ background: `radial-gradient(ellipse at 50% 100%, ${ai.color}25, oklch(0.13 0.015 260))` }}
                >
                  <Image
                    src={ai.image}
                    alt={ai.name}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, oklch(0.13 0.015 260) 0%, transparent 50%)` }} />

                  {/* Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge className="text-xs font-semibold" style={{ background: `${ai.color}25`, borderColor: `${ai.color}50`, color: ai.color }}>
                      {ai.badge}
                    </Badge>
                    <Badge className="text-xs" style={{ background: 'oklch(0.13 0.015 260 / 80%)', borderColor: `${tierColors[ai.tier]}30`, color: tierColors[ai.tier] }}>
                      {ai.tier}
                    </Badge>
                  </div>

                  {/* Price floating */}
                  <div className="absolute bottom-3 right-3">
                    <span className="font-heading font-bold text-2xl" style={{ color: ai.color }}>${ai.price}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <h3 className="font-heading font-bold text-xl" style={{ color: ai.color }}>{ai.name}</h3>
                    <p className="text-sm text-muted-foreground">{ai.tagline}</p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ai.description}</p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1">
                    {ai.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs py-0">{skill}</Badge>
                    ))}
                    {ai.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs py-0">+{ai.skills.length - 3}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAI(ai)}
                      className="flex-1 text-xs"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(ai)}
                      disabled={inCart}
                      className="flex-1 text-xs font-semibold"
                      style={inCart ? {} : { background: ai.color, color: '#000' }}
                    >
                      {inCart ? (
                        <>
                          <Check className="size-3.5" data-icon="inline-start" />
                          In Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="size-3.5" data-icon="inline-start" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Compare note */}
        <div className="mt-10 card-glass rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading font-bold text-base">Not sure which one to pick?</h3>
            <p className="text-sm text-muted-foreground">You can always upgrade your pre-built AI with new skills and tools from the Shop later on.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button variant="outline" size="sm" className="text-xs">
              <Star className="size-3.5" data-icon="inline-start" />
              Compare All
            </Button>
            <Button size="sm" className="text-xs font-semibold" style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}>
              <Zap className="size-3.5" data-icon="inline-start" />
              Build Custom Instead
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAI && (
        <Dialog open={!!selectedAI} onOpenChange={() => setSelectedAI(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden" style={{ background: 'oklch(0.13 0.015 260)', border: `1px solid ${selectedAI.color}20` }}>
            <DialogTitle className="sr-only">{selectedAI.name} Details</DialogTitle>

            {/* Hero image */}
            <div className="relative h-64" style={{ background: `radial-gradient(ellipse at 50% 100%, ${selectedAI.color}30, oklch(0.13 0.015 260))` }}>
              <Image src={selectedAI.image} alt={selectedAI.name} fill className="object-cover object-top" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, oklch(0.13 0.015 260) 0%, transparent 60%)` }} />
              <div className="absolute bottom-4 left-6">
                <h2 className="font-heading font-bold text-4xl" style={{ color: selectedAI.color }}>{selectedAI.name}</h2>
                <p className="text-muted-foreground">{selectedAI.tagline}</p>
              </div>
              <div className="absolute top-4 right-4">
                <Badge style={{ background: `${selectedAI.color}20`, borderColor: `${selectedAI.color}40`, color: selectedAI.color }}>
                  {selectedAI.badge}
                </Badge>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedAI.description}</p>

              <Separator />

              <div>
                <h3 className="font-heading font-bold text-sm mb-3">Included Skills</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAI.skills.map((skill) => (
                    <div key={skill} className="flex items-center gap-2 text-sm">
                      <div className="size-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${selectedAI.color}20` }}>
                        <Check className="size-2.5" style={{ color: selectedAI.color }} />
                      </div>
                      <span className="text-sm">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">One-time purchase</p>
                  <span className="font-heading font-bold text-3xl" style={{ color: selectedAI.color }}>${selectedAI.price}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSelectedAI(null)} size="sm">Close</Button>
                  <Button
                    onClick={() => { handleAddToCart(selectedAI); setSelectedAI(null) }}
                    disabled={isInCart(selectedAI.id)}
                    size="sm"
                    className="font-semibold"
                    style={{ background: selectedAI.color, color: '#000' }}
                  >
                    {isInCart(selectedAI.id) ? (
                      <><Check className="size-4" data-icon="inline-start" />In Cart</>
                    ) : (
                      <><ShoppingCart className="size-4" data-icon="inline-start" />Add to Cart</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

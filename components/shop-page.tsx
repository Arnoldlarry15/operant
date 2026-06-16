"use client"

import { useState } from 'react'
import { ShoppingCart, Check, Sparkles, Tag, Flame, Star, Filter } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { shopItems, skills } from '@/lib/store-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import * as Icons from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  Terminal: Icons.Terminal,
  Brain: Icons.Brain,
  Sparkles: Icons.Sparkles,
  Zap: Icons.Zap,
  Video: Icons.Video,
  Shield: Icons.Shield,
  TrendingUp: Icons.TrendingUp,
  RefreshCw: Icons.RefreshCw,
  Stars: Icons.Stars,
  Play: Icons.Play,
  Wind: Icons.Wind,
  ChefHat: Icons.ChefHat,
  Globe: Icons.Globe,
  Code: Icons.Code,
  Image: Icons.Image,
  Calendar: Icons.Calendar,
  Mail: Icons.Mail,
  DollarSign: Icons.DollarSign,
  Activity: Icons.Activity,
  Languages: Icons.Languages,
  BookOpen: Icons.BookOpen,
  Share2: Icons.Share2,
  BarChart2: Icons.BarChart2,
  Mic: Icons.Mic,
}

const categories = ['all', 'skill', 'upgrade', 'appearance', 'accessory', 'tool']

type ShopItemType = typeof shopItems[0]
type SkillItem = {
  id: string
  name: string
  icon: string
  description: string
  category: string
  price: number
  tier: 'basic' | 'pro' | 'elite'
  isNew?: boolean
  isSale?: boolean
  salePrice?: number
  color: string
  itemType: 'skill'
}

export function ShopPage() {
  const { addToCart, cart, addNotification } = useAppState()
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('upgrades')

  const isInCart = (id: string) => cart.some((c) => c.id === `shop-${id}`)

  const handleAdd = (item: ShopItemType | SkillItem) => {
    const price = 'isSale' in item && item.isSale && item.salePrice ? item.salePrice : item.price
    if (!isInCart(item.id)) {
      addToCart({ id: `shop-${item.id}`, name: item.name, price, type: 'shop' })
      addNotification(`${item.name} added to cart!`, 'success')
    }
  }

  const filteredShopItems = activeCategory === 'all'
    ? shopItems
    : shopItems.filter((i) => i.category === activeCategory)

  const tierColors: Record<string, string> = {
    basic: '#22d3ee',
    pro: '#a855f7',
    elite: '#f59e0b',
  }

  const featured = shopItems.filter((i) => i.isNew || i.isSale).slice(0, 4)

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-4 text-xs" style={{ background: 'oklch(0.72 0.19 35 / 10%)', borderColor: 'oklch(0.72 0.19 35 / 30%)', color: 'oklch(0.80 0.2 35)' }}>
            <ShoppingCart className="size-3 mr-1" />
            The Operant Shop
          </Badge>
          <h1 className="font-heading font-bold text-3xl md:text-5xl text-balance">
            Upgrade Your <span className="text-gradient-ember">AI Agent</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-pretty">
            New skills, appearances, tools, and power upgrades drop regularly. Your AI never has to stay the same.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 w-full md:w-auto">
            <TabsTrigger value="upgrades">All Upgrades</TabsTrigger>
            <TabsTrigger value="skills">Skill Store</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>

          {/* All Upgrades Tab */}
          <TabsContent value="upgrades">
            {/* Category filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
              <Filter className="size-4 text-muted-foreground flex-shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'text-black font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  style={activeCategory === cat ? { background: 'oklch(0.75 0.18 195)' } : {}}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShopItems.map((item) => {
                const IconComp = iconMap[item.icon] ?? Sparkles
                const inCart = isInCart(item.id)
                const displayPrice = item.isSale && item.salePrice ? item.salePrice : item.price
                return (
                  <div
                    key={item.id}
                    className="card-glass card-glass-hover rounded-2xl p-5 flex flex-col gap-4"
                    style={{ border: `1px solid ${item.color}10` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="size-11 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                        <IconComp className="size-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.isNew && (
                          <Badge className="text-xs py-0" style={{ background: '#22d3ee15', color: '#22d3ee', border: '1px solid #22d3ee30' }}>
                            <Sparkles className="size-2.5 mr-0.5" />New
                          </Badge>
                        )}
                        {item.isSale && (
                          <Badge className="text-xs py-0" style={{ background: '#fb923c15', color: '#fb923c', border: '1px solid #fb923c30' }}>
                            <Tag className="size-2.5 mr-0.5" />Sale
                          </Badge>
                        )}
                        <Badge className="text-xs py-0" style={{ background: `${tierColors[item.tier]}10`, color: tierColors[item.tier], border: `1px solid ${tierColors[item.tier]}30` }}>
                          {item.tier}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 flex-1">
                      <p className="font-heading font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      <Badge variant="secondary" className="text-xs w-fit mt-1 capitalize">{item.category}</Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: item.color }}>${displayPrice}</span>
                        {item.isSale && item.salePrice && (
                          <span className="text-xs text-muted-foreground line-through">${item.price}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(item)}
                        disabled={inCart}
                        className="text-xs font-semibold"
                        style={inCart ? {} : { background: item.color, color: '#000' }}
                      >
                        {inCart ? (
                          <><Check className="size-3.5" data-icon="inline-start" />Added</>
                        ) : (
                          <><ShoppingCart className="size-3.5" data-icon="inline-start" />Add</>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Skill Store Tab */}
          <TabsContent value="skills">
            <div className="mb-6">
              <h2 className="font-heading font-bold text-lg mb-1">All Available Skills</h2>
              <p className="text-sm text-muted-foreground">Add any of these skills to your AI agent at any time.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => {
                const IconComp = iconMap[skill.icon] ?? Sparkles
                const inCart = isInCart(skill.id)
                const color = tierColors[skill.tier]
                const skillAsShopItem = {
                  ...skill,
                  color,
                  isNew: false,
                  isSale: false,
                  category: skill.category as 'skill',
                  itemType: 'skill' as const,
                }
                return (
                  <div
                    key={skill.id}
                    className="card-glass card-glass-hover rounded-2xl p-5 flex flex-col gap-4"
                    style={{ border: `1px solid ${color}10` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="size-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                        <IconComp className="size-5" style={{ color }} />
                      </div>
                      <Badge className="text-xs py-0" style={{ background: `${color}10`, color, border: `1px solid ${color}30` }}>
                        {skill.tier}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <p className="font-heading font-bold text-sm">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">{skill.description}</p>
                      <Badge variant="secondary" className="text-xs w-fit mt-1">{skill.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-bold text-lg" style={{ color }}>${skill.price}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(skillAsShopItem)}
                        disabled={inCart}
                        className="text-xs font-semibold"
                        style={inCart ? {} : { background: color, color: '#000' }}
                      >
                        {inCart ? (
                          <><Check className="size-3.5" data-icon="inline-start" />Added</>
                        ) : (
                          <><ShoppingCart className="size-3.5" data-icon="inline-start" />Add</>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Featured Tab */}
          <TabsContent value="featured">
            <div className="mb-6">
              <h2 className="font-heading font-bold text-lg mb-1">Featured & On Sale</h2>
              <p className="text-sm text-muted-foreground">New drops and limited-time deals — don&apos;t miss out.</p>
            </div>

            {/* Big feature cards */}
            <div className="grid md:grid-cols-2 gap-5 mb-8">
              {featured.map((item) => {
                const IconComp = iconMap[item.icon] ?? Sparkles
                const inCart = isInCart(item.id)
                const displayPrice = item.isSale && item.salePrice ? item.salePrice : item.price
                return (
                  <div
                    key={item.id}
                    className="card-glass rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden"
                    style={{ border: `1px solid ${item.color}20` }}
                  >
                    <div className="absolute top-0 right-0 size-32 rounded-full blur-3xl opacity-20" style={{ background: item.color, transform: 'translate(30%, -30%)' }} />
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                        <IconComp className="size-7" style={{ color: item.color }} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {item.isNew && <Badge className="text-xs" style={{ background: '#22d3ee15', color: '#22d3ee', border: '1px solid #22d3ee30' }}><Sparkles className="size-2.5 mr-0.5" />New</Badge>}
                          {item.isSale && <Badge className="text-xs" style={{ background: '#fb923c15', color: '#fb923c', border: '1px solid #fb923c30' }}><Flame className="size-2.5 mr-0.5" />Sale</Badge>}
                        </div>
                        <h3 className="font-heading font-bold text-base">{item.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl" style={{ color: item.color }}>${displayPrice}</span>
                        {item.isSale && item.salePrice && (
                          <span className="text-sm text-muted-foreground line-through">${item.price}</span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleAdd(item)}
                        disabled={inCart}
                        className="font-semibold"
                        style={inCart ? {} : { background: item.color, color: '#000' }}
                      >
                        {inCart ? <><Check className="size-4" data-icon="inline-start" />Added</> : <><ShoppingCart className="size-4" data-icon="inline-start" />Add to Cart</>}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top rated callout */}
            <div className="card-glass rounded-2xl p-6 text-center" style={{ border: '1px solid oklch(0.75 0.18 195 / 15%)' }}>
              <Star className="size-8 text-primary mx-auto mb-3" />
              <h3 className="font-heading font-bold text-lg mb-2">Top Rated This Week</h3>
              <p className="text-sm text-muted-foreground mb-4">Memory Vault is the most popular upgrade with a 4.9 star rating from 2,300+ users.</p>
              <Button style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }} onClick={() => handleAdd(shopItems[1])}>
                <ShoppingCart className="size-4" data-icon="inline-start" />
                Add Memory Vault — $19
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

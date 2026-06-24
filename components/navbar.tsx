"use client"

import { ShoppingCart, Menu, X, LogOut, CheckCircle, Bot } from 'lucide-react'
import { useAppState } from '@/lib/app-state'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { StripeCheckout, CheckoutSuccess } from '@/components/stripe-checkout'
import { OperantLogo } from '@/components/operant-logo'

const navLinks = [
  { label: 'Home', page: 'home' as const },
  { label: 'Build Your AI', page: 'builder' as const },
  { label: 'Prebuilt Agents', page: 'prebuilt' as const },
  { label: 'Shop', page: 'shop' as const },
  { label: 'My Dashboard', page: 'dashboard' as const },
]

type CheckoutState = 'cart' | 'stripe' | 'success'

type PurchasedCompanion = {
  id: string
  name: string
  color: string
  emoji: string
  companion_type: string
}

export function Navbar() {
  const { currentPage, setPage, cart, cartOpen, setCartOpen, removeFromCart, clearCart } = useAppState()
  const { user, profile, signOut } = useAuth()
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('cart')
  const [purchasedCompanions, setPurchasedCompanions] = useState<PurchasedCompanion[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  const total = cart.reduce((sum, item) => sum + item.price, 0)
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  function handleOpenCart() {
    setCheckoutState('cart')
    setPurchasedCompanions([])
    setCartOpen(true)
  }

  function handleClose() {
    setCartOpen(false)
    // Reset back to cart view after sheet closes
    setTimeout(() => {
      setCheckoutState('cart')
      setPurchasedCompanions([])
    }, 300)
  }

  function handleCheckout() {
    if (!user) {
      toast.error('Sign in to complete your purchase')
      return
    }
    setCheckoutState('stripe')
  }

  function handleStripeSuccess(companions: PurchasedCompanion[]) {
    clearCart()
    setPurchasedCompanions(companions)
    setCheckoutState('success')
  }

  function handleGoToCompanion(companionId: string) {
    handleClose()
    // Small delay to let sheet close before navigation
    setTimeout(() => {
      window.location.href = `/companion/${companionId}`
    }, 320)
  }

  function handleGoToDashboard() {
    handleClose()
    setTimeout(() => setPage('dashboard'), 320)
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-8"
        style={{ background: 'oklch(0.09 0.01 260 / 95%)', backdropFilter: 'blur(16px)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}
      >
        {/* Logo */}
        <button onClick={() => setPage('home')} className="flex items-center gap-2 mr-8 group">
          <OperantLogo size={32} className="glow-cyan" />
          <span className="font-heading font-bold text-xl text-gradient tracking-tight">Operant</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => setPage(link.page)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                currentPage === link.page
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cart button */}
          <button
            onClick={handleOpenCart}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={`Cart with ${cart.length} items`}
          >
            <ShoppingCart className="size-5 text-muted-foreground" />
            {cart.length > 0 && (
              <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground border-0">
                {cart.length}
              </Badge>
            )}
          </button>

          {/* Auth */}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setPage('dashboard')}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                <Avatar className="size-7">
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{ background: 'oklch(0.75 0.18 195 / 20%)', color: 'oklch(0.75 0.18 195)' }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
              </button>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground px-2">
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-sm" render={<Link href="/auth/login" />}>
                Sign In
              </Button>
              <Button
                size="sm"
                className="text-sm font-semibold"
                style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                render={<Link href="/auth/sign-up" />}
              >
                Join Free
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* ── Cart / Checkout Sheet ─────────────────────────────────────── */}
      <Sheet open={cartOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
        <SheetContent
          className="w-full max-w-sm flex flex-col"
          style={{ background: 'oklch(0.11 0.015 260)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
        >
          {/* ── STATE: CART ── */}
          {checkoutState === 'cart' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="size-5 text-primary" />
                  Your Cart
                  {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16">
                    <div className="size-16 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.18 0.02 260)' }}>
                      <ShoppingCart className="size-7 text-muted-foreground" />
                    </div>
                    <p className="font-heading font-semibold">Nothing here yet</p>
                    <p className="text-muted-foreground text-sm">Add agents or upgrades to get started.</p>
                    <Button
                      size="sm"
                      onClick={() => { handleClose(); setPage('prebuilt') }}
                      style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                    >
                      Browse Prebuilt Agents
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Order summary header */}
                    <div className="px-1 pb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Summary</p>
                    </div>
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl card-glass"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: item.type === 'prebuilt' ? 'oklch(0.68 0.18 280 / 15%)' : 'oklch(0.75 0.18 195 / 15%)' }}
                          >
                            <Bot className="size-4" style={{ color: item.type === 'prebuilt' ? 'oklch(0.75 0.18 280)' : 'oklch(0.75 0.18 195)' }} />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-sm font-medium truncate">{item.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{item.type === 'prebuilt' ? 'Prebuilt agent' : item.type === 'custom' ? 'Custom agent' : 'Upgrade'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-primary">${item.price.toFixed(2)}</span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="size-6 flex items-center justify-center rounded-md hover:bg-destructive/20 transition-colors"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <X className="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 flex flex-col gap-3 border-t border-border">
                  <Separator />
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold font-heading text-primary">${total.toFixed(2)}</span>
                  </div>

                  {!user && (
                    <div
                      className="p-3 rounded-xl text-xs text-center"
                      style={{ background: 'oklch(0.75 0.18 195 / 10%)', color: 'oklch(0.75 0.18 195)', border: '1px solid oklch(0.75 0.18 195 / 20%)' }}
                    >
                      <Link href="/auth/login" className="underline font-semibold">Sign in</Link> to complete your purchase.
                    </div>
                  )}

                  <Button
                    className="w-full font-bold text-sm h-11"
                    style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                    onClick={handleCheckout}
                    disabled={!user}
                  >
                    <CheckCircle className="size-4" data-icon="inline-start" />
                    Confirm Purchase &mdash; ${total.toFixed(2)}
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={handleClose}>
                    Continue Shopping
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ── STATE: STRIPE EMBEDDED CHECKOUT ── */}
          {checkoutState === 'stripe' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-primary" />
                  Secure Checkout
                </SheetTitle>
              </SheetHeader>
              <StripeCheckout
                items={cart.map((item) => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  type: item.type,
                  companionMeta: item.companionMeta,
                }))}
                onSuccess={handleStripeSuccess}
                onCancel={() => setCheckoutState('cart')}
              />
            </>
          )}

          {/* ── STATE: SUCCESS ── */}
          {checkoutState === 'success' && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5" style={{ color: 'oklch(0.75 0.18 195)' }} />
                  Purchase Complete
                </SheetTitle>
              </SheetHeader>
              <CheckoutSuccess
                companions={purchasedCompanions}
                onGoToDashboard={handleGoToDashboard}
                onKeepShopping={handleClose}
                onGoToCompanion={handleGoToCompanion}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Mobile Menu ──────────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" style={{ background: 'oklch(0.11 0.015 260)', borderRight: '1px solid oklch(1 0 0 / 8%)' }}>
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col gap-2 pt-8">
            <div className="flex items-center gap-2 mb-6">
              <OperantLogo size={32} />
              <span className="font-heading font-bold text-xl text-gradient">Operant</span>
            </div>
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => { setPage(link.page); setMobileOpen(false) }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentPage === link.page ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {link.label}
              </button>
            ))}
            <Separator className="my-4" />
            {user ? (
              <Button variant="ghost" className="w-full text-muted-foreground gap-2" onClick={() => { signOut(); setMobileOpen(false) }}>
                <LogOut className="size-4" data-icon="inline-start" />
                Sign Out
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" render={<Link href="/auth/login" onClick={() => setMobileOpen(false)} />}>
                  Sign In
                </Button>
                <Button
                  className="w-full font-semibold"
                  style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
                  render={<Link href="/auth/sign-up" onClick={() => setMobileOpen(false)} />}
                >
                  Create Free Account
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

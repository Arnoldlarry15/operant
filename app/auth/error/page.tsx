import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
              <line x1="12" y1="22" x2="12" y2="15.5"/>
              <polyline points="22 8.5 12 15.5 2 8.5"/>
            </svg>
          </div>
          <span className="text-2xl font-bold font-sans tracking-tight text-foreground">Operant</span>
        </Link>

        <Card className="border-border/50 bg-card shadow-2xl">
          <CardHeader className="pb-2 pt-8">
            <div className="size-16 rounded-full bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Authentication Error</h1>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-muted-foreground leading-relaxed">
              Something went wrong during authentication. The link may have expired or already been used.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pb-8">
            <Button className="w-full" render={<Link href="/auth/login" />}>
              Try Signing In
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" render={<Link href="/auth/sign-up" />}>
              Create New Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

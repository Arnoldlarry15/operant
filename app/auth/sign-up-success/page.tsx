import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export default function SignUpSuccessPage() {
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
            <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                <path d="m16 19 2 2 4-4"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Check your inbox!</h1>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-muted-foreground leading-relaxed">
              We sent a confirmation link to your email address. Click the link to activate your account and meet your free AI companion.
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 border border-border/50 px-4 py-3 text-sm text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder, or try signing up again with the same email.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pb-8">
            <Button className="w-full" render={<Link href="/auth/login" />}>
              Go to Login
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" render={<Link href="/" />}>
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

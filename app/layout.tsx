import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ClientProviders } from '@/components/client-providers'
import { Toaster } from 'sonner'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Operant - Build Purpose-Built AI Agents',
  description: 'Buy prebuilt AI agents, build custom agents from modular components, and upgrade them with specialized skills.',
  keywords: 'AI agent, custom AI agent, prebuilt AI agent, AI automation, modular AI, AI skills, Operant',
  openGraph: {
    title: 'Operant - Build Purpose-Built AI Agents',
    description: 'Buy prebuilt AI agents, build custom agents, and upgrade them with specialized skills.',
    type: 'website',
  },
}

export const viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} bg-background dark`}>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        <ClientProviders>
          <TooltipProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: { background: 'oklch(0.16 0.015 260)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.93 0.01 260)' },
              }}
            />
          </TooltipProvider>
        </ClientProviders>
      </body>
    </html>
  )
}


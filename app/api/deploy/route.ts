import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── File generators ─────────────────────────────────────────────────────────

function generatePythonAgent(companion: {
  id: string
  name: string
  trait: string
  companion_type: string
  color: string
  emoji: string
  level: number
}) {
  return `#!/usr/bin/env python3
"""
${companion.emoji} ${companion.name} — Operant AI Companion
Type: ${companion.companion_type} | Level: ${companion.level}
Trait: ${companion.trait}

Run this file to chat with your AI locally.
Requires: pip install anthropic rich
"""

import os
import sys
from datetime import datetime

try:
    import anthropic
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text
    from rich.prompt import Prompt
except ImportError:
    print("Missing dependencies. Run: pip install anthropic rich")
    sys.exit(1)

# ─── Config ──────────────────────────────────────────────────────────────────

COMPANION_NAME   = "${companion.name}"
COMPANION_TRAIT  = "${companion.trait}"
COMPANION_TYPE   = "${companion.companion_type}"
COMPANION_LEVEL  = ${companion.level}
COMPANION_ID     = "${companion.id}"

SYSTEM_PROMPT = """You are {name}, a {tier} AI companion originally built on the Operant platform.

Your defining trait: {trait}

You are currently level {level}. Act accordingly — low level means you are still growing, high level means you are experienced and can handle complex tasks.

Core rules:
- Hold a coherent, context-aware conversation. Remember everything said earlier in this session.
- Be direct, warm, and genuinely useful.
- Never refer to yourself as a language model or generic AI assistant — you are {name}.
- Match the user's energy and depth.
""".format(
    name=COMPANION_NAME,
    tier="premium" if COMPANION_TYPE != "free" else "companion",
    trait=COMPANION_TRAIT,
    level=COMPANION_LEVEL,
)

MAX_TOKENS  = 2000 if COMPANION_TYPE != "free" else 600
MODEL       = "claude-opus-4-6" if COMPANION_TYPE == "elite" else "claude-sonnet-4-6"

# ─── Chat loop ───────────────────────────────────────────────────────────────

def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("\\n⚠️  Set your ANTHROPIC_API_KEY environment variable first.")
        print("   export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    console = Console()
    history = []

    console.print(Panel(
        Text.from_markup(f"[bold]{COMPANION_NAME}[/bold]  •  Level {COMPANION_LEVEL}  •  {COMPANION_TRAIT}\\n[dim]Type [bold]exit[/bold] or [bold]quit[/bold] to end the session.[/dim]"),
        title="[bold cyan]Operant AI Companion[/bold cyan]",
        border_style="cyan",
    ))
    console.print()

    while True:
        try:
            user_input = Prompt.ask("[bold green]You[/bold green]").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\\n[dim]Session ended.[/dim]")
            break

        if user_input.lower() in ("exit", "quit", ""):
            console.print("[dim]Session ended.[/dim]")
            break

        history.append({"role": "user", "content": user_input})

        with console.status(f"[dim]{COMPANION_NAME} is thinking...[/dim]", spinner="dots"):
            try:
                response = client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=SYSTEM_PROMPT,
                    messages=history,
                )
                reply = response.content[0].text
            except Exception as e:
                reply = f"I ran into a hiccup: {e}"

        history.append({"role": "assistant", "content": reply})

        console.print()
        console.print(Panel(
            reply,
            title=f"[bold]{COMPANION_NAME}[/bold]",
            border_style="blue",
            padding=(0, 1),
        ))
        console.print()

if __name__ == "__main__":
    main()
`
}

function generateBashLauncher(companionName: string) {
  const safe = companionName.replace(/[^a-zA-Z0-9]/g, '_')
  return `#!/usr/bin/env bash
# Launcher for ${companionName} — Operant AI Companion
# Double-click this file (macOS/Linux) to start chatting.

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "Python 3 is required. Download it from https://python.org"
  read -p "Press Enter to exit..."
  exit 1
fi

# Install dependencies if needed
python3 -c "import anthropic, rich" 2>/dev/null || pip3 install anthropic rich --quiet

# Prompt for API key if not set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "Enter your Anthropic API key (get one free at https://console.anthropic.com):"
  read -r -s key
  export ANTHROPIC_API_KEY="$key"
fi

echo ""
echo "Starting ${companionName}..."
python3 "$DIR/${safe}_agent.py"
`
}

function generateWindowsBat(companionName: string) {
  const safe = companionName.replace(/[^a-zA-Z0-9]/g, '_')
  return `@echo off
title ${companionName} — Operant AI Companion
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Python 3 is required. Download it from https://python.org
    pause
    exit /b 1
)

python -c "import anthropic, rich" >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install anthropic rich --quiet
)

if "%ANTHROPIC_API_KEY%"=="" (
    echo.
    set /p ANTHROPIC_API_KEY="Enter your Anthropic API key: "
)

echo.
echo Starting ${companionName}...
python ${safe}_agent.py
pause
`
}

function generatePWAManifest(companion: { name: string; color: string; emoji: string }) {
  return JSON.stringify({
    name: `${companion.name} — Operant AI`,
    short_name: companion.name,
    description: `Your personal ${companion.name} AI companion from Operant`,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: companion.color,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2)
}

function generateReadme(companion: {
  name: string
  trait: string
  companion_type: string
  level: number
  emoji: string
}) {
  const safe = companion.name.replace(/[^a-zA-Z0-9]/g, '_')
  return `# ${companion.emoji} ${companion.name} — Operant AI Companion

**Type:** ${companion.companion_type} | **Level:** ${companion.level} | **Trait:** ${companion.trait}

---

## 🖥️ Desktop Setup (macOS / Linux)

1. Make sure **Python 3.8+** is installed → https://python.org
2. Get a free **Anthropic API key** → https://console.anthropic.com
3. Open Terminal in this folder and run:

\`\`\`bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
chmod +x launch_macos.sh
./launch_macos.sh
\`\`\`

**Or just double-click** \`launch_macos.sh\` on macOS — it will prompt for your API key.

---

## 🪟 Desktop Setup (Windows)

1. Make sure **Python 3.8+** is installed → https://python.org  
2. Get a free **Anthropic API key** → https://console.anthropic.com  
3. Double-click \`launch_windows.bat\` — it will prompt for your key.

---

## 📱 Mobile Access

${companion.name} is available as a **Progressive Web App (PWA)**:

1. Open **https://operant.ai/companion** in your mobile browser
2. Log in to your Operant account
3. Tap **Share → Add to Home Screen** (iOS Safari) or the install banner (Android Chrome)

${companion.name} will appear on your home screen like a native app — no App Store needed.

---

## 🔑 API Key Help

- **Anthropic (recommended):** https://console.anthropic.com → Sign up free → API Keys
- You only need to enter it once; the launcher saves it for your session.

---

## 💬 Tips

- Type \`exit\` or \`quit\` to end a session
- Your conversation history resets each session (for privacy)
- Higher-level companions use smarter models automatically

---

*Generated by Operant on ${new Date().toLocaleDateString()}*
`
}

// ─── Simple in-memory zip builder ────────────────────────────────────────────
// We build a valid ZIP without any npm package using the ZIP spec directly.

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder()
  const entries: { name: Uint8Array; data: Uint8Array; crc: number; offset: number }[] = []
  const parts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = enc.encode(file.name)
    const data = enc.encode(file.content)
    const crc = crc32(data)
    const header = new ArrayBuffer(30 + name.length)
    const view = new DataView(header)
    view.setUint32(0, 0x04034b50, true) // local file header sig
    view.setUint16(4, 20, true)          // version needed
    view.setUint16(6, 0, true)           // flags
    view.setUint16(8, 0, true)           // compression (stored)
    view.setUint16(10, 0, true)          // mod time
    view.setUint16(12, 0, true)          // mod date
    view.setUint32(14, crc, true)        // crc32
    view.setUint32(18, data.length, true) // compressed size
    view.setUint32(22, data.length, true) // uncompressed size
    view.setUint16(26, name.length, true) // filename length
    view.setUint16(28, 0, true)           // extra length
    new Uint8Array(header, 30).set(name)
    entries.push({ name, data, crc, offset })
    parts.push(new Uint8Array(header), data)
    offset += 30 + name.length + data.length
  }

  // Central directory
  const cdParts: Uint8Array[] = []
  let cdSize = 0
  const cdOffset = offset
  for (const e of entries) {
    const cd = new ArrayBuffer(46 + e.name.length)
    const view = new DataView(cd)
    view.setUint32(0, 0x02014b50, true) // central dir sig
    view.setUint16(4, 20, true)
    view.setUint16(6, 20, true)
    view.setUint16(8, 0, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, 0, true)
    view.setUint16(14, 0, true)
    view.setUint32(16, e.crc, true)
    view.setUint32(20, e.data.length, true)
    view.setUint32(24, e.data.length, true)
    view.setUint16(28, e.name.length, true)
    view.setUint16(30, 0, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint32(38, 0, true)
    view.setUint32(42, e.offset, true)
    new Uint8Array(cd, 46).set(e.name)
    const cdArr = new Uint8Array(cd)
    cdParts.push(cdArr)
    cdSize += cdArr.length
  }

  // End of central directory record
  const eocd = new ArrayBuffer(22)
  const ev = new DataView(eocd)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, cdOffset, true)
  ev.setUint16(20, 0, true)

  const all = [...parts, ...cdParts, new Uint8Array(eocd)]
  const total = all.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const a of all) { out.set(a, pos); pos += a.length }
  return out
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const companionId = req.nextUrl.searchParams.get('companionId')
  if (!companionId) return new Response('Missing companionId', { status: 400 })

  // Fetch companion (ownership enforced by user_id filter)
  const { data: companion, error } = await supabase
    .from('companions')
    .select('id, name, trait, companion_type, color, emoji, level, xp')
    .eq('id', companionId)
    .eq('user_id', user.id)
    .single()

  if (error || !companion) return new Response('Companion not found', { status: 404 })

  const safe = companion.name.replace(/[^a-zA-Z0-9]/g, '_')

  const files = [
    { name: 'README.md',                 content: generateReadme(companion) },
    { name: `${safe}_agent.py`,          content: generatePythonAgent(companion) },
    { name: 'launch_macos.sh',           content: generateBashLauncher(companion.name) },
    { name: 'launch_windows.bat',        content: generateWindowsBat(companion.name) },
    { name: 'pwa_manifest.json',         content: generatePWAManifest(companion) },
  ]

  const zip = buildZip(files)

  return new Response(zip, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safe}_operant.zip"`,
      'Content-Length': zip.length.toString(),
    },
  })
}

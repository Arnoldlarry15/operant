"use client"

import { useState } from 'react'
import { X, Zap, Check, ChevronRight, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { assignPendingSkill } from '@/lib/actions'

type PendingSkill = {
  id: string
  skill_id: string
  skill_name: string
  created_at: string
}

type Companion = {
  id: string
  name: string
  color: string
  emoji: string
  companion_type: string
}

type Props = {
  pendingSkills: PendingSkill[]
  companions: Companion[]
  onClose: () => void
  onAssigned: (pendingSkillId: string) => void
}

export function AssignSkillModal({ pendingSkills, companions, onClose, onAssigned }: Props) {
  const [selectedSkill, setSelectedSkill] = useState<PendingSkill | null>(
    pendingSkills[0] ?? null
  )
  const [selectedAgent, setSelectedAgent] = useState<Companion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justAssigned, setJustAssigned] = useState<string | null>(null)

  async function handleAssign() {
    if (!selectedSkill || !selectedAgent) return
    setLoading(true)
    setError(null)
    try {
      const result = await assignPendingSkill(
        selectedSkill.id,
        selectedAgent.id,
        selectedSkill.skill_id,
        selectedSkill.skill_name,
      )
      if ('error' in result) {
        setError(result.error ?? 'Assignment failed')
        return
      }
      setJustAssigned(selectedSkill.skill_name)
      onAssigned(selectedSkill.id)

      // Move to next pending skill if any
      const remaining = pendingSkills.filter((s) => s.id !== selectedSkill.id)
      setSelectedSkill(remaining[0] ?? null)
      setSelectedAgent(null)

      setTimeout(() => setJustAssigned(null), 2500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const noPendingLeft = pendingSkills.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'oklch(0.05 0.01 260 / 80%)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'oklch(0.10 0.015 260)',
          border: '1px solid oklch(0.75 0.18 195 / 25%)',
          boxShadow: '0 0 60px oklch(0.75 0.18 195 / 10%), 0 25px 50px oklch(0 0 0 / 60%)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid oklch(0.16 0.015 260)' }}>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl flex items-center justify-center"
              style={{ background: 'oklch(0.75 0.18 195 / 15%)', border: '1px solid oklch(0.75 0.18 195 / 30%)' }}>
              <Package className="size-4" style={{ color: 'oklch(0.82 0.2 195)' }} />
            </div>
            <div>
              <h2 className="font-bold text-base">Assign Upgrades</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {noPendingLeft
                  ? 'All upgrades assigned!'
                  : `${pendingSkills.length} upgrade${pendingSkills.length > 1 ? 's' : ''} waiting to be assigned`}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {noPendingLeft ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="size-12 rounded-full flex items-center justify-center"
              style={{ background: 'oklch(0.75 0.18 195 / 15%)' }}>
              <Check className="size-6" style={{ color: 'oklch(0.82 0.2 195)' }} />
            </div>
            <p className="font-semibold text-foreground">All upgrades assigned!</p>
            <p className="text-sm text-muted-foreground">Your agents are ready.</p>
            <Button onClick={onClose} className="mt-2"
              style={{ background: 'oklch(0.75 0.18 195)', color: '#000', fontWeight: 600 }}>
              Done
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-6 p-6">

            {/* Success toast */}
            {justAssigned && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'oklch(0.75 0.18 195 / 12%)', border: '1px solid oklch(0.75 0.18 195 / 25%)', color: 'oklch(0.82 0.2 195)' }}>
                <Check className="size-4 flex-shrink-0" />
                <span><strong>{justAssigned}</strong> installed successfully!</span>
              </div>
            )}

            {/* Step 1: Pick a skill */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                1. Choose an upgrade to install
              </p>
              <div className="flex flex-col gap-2">
                {pendingSkills.map((skill) => {
                  const isSelected = selectedSkill?.id === skill.id
                  return (
                    <button
                      key={skill.id}
                      onClick={() => { setSelectedSkill(skill); setSelectedAgent(null) }}
                      className="flex items-center gap-3 p-3 rounded-xl text-left w-full transition-all"
                      style={{
                        background: isSelected ? 'oklch(0.75 0.18 195 / 12%)' : 'oklch(0.08 0.01 260)',
                        border: `1px solid ${isSelected ? 'oklch(0.75 0.18 195 / 40%)' : 'oklch(0.16 0.01 260)'}`,
                      }}
                    >
                      <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'oklch(0.75 0.18 195 / 15%)' }}>
                        <Zap className="size-4" style={{ color: 'oklch(0.82 0.2 195)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Purchased {new Date(skill.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {isSelected && <Check className="size-4 flex-shrink-0" style={{ color: 'oklch(0.82 0.2 195)' }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Pick an agent */}
            {selectedSkill && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  2. Choose which agent gets it
                </p>
                {companions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 rounded-xl text-center"
                    style={{ background: 'oklch(0.08 0.01 260)', border: '1px solid oklch(0.14 0.01 260)' }}>
                    You don't have any purchased agents yet.
                    Buy one from the store first!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {companions.map((c) => {
                      const isSelected = selectedAgent?.id === c.id
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedAgent(c)}
                          className="flex items-center gap-3 p-3 rounded-xl text-left w-full transition-all"
                          style={{
                            background: isSelected ? `${c.color}12` : 'oklch(0.08 0.01 260)',
                            border: `1px solid ${isSelected ? `${c.color}40` : 'oklch(0.16 0.01 260)'}`,
                          }}
                        >
                          <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                            style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                            {c.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{c.companion_type}</p>
                          </div>
                          {isSelected && <Check className="size-4 flex-shrink-0" style={{ color: c.color }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 px-1">{error}</p>
            )}

            {/* Assign button */}
            <Button
              onClick={handleAssign}
              disabled={!selectedSkill || !selectedAgent || loading}
              className="w-full gap-2 font-semibold h-11"
              style={{ background: 'oklch(0.75 0.18 195)', color: '#000' }}
            >
              {loading ? (
                <span className="animate-spin">...</span>
              ) : (
                <ChevronRight className="size-4" />
              )}
              {loading
                ? 'Installing...'
                : selectedSkill && selectedAgent
                ? `Install ${selectedSkill.skill_name} on ${selectedAgent.name}`
                : 'Select a skill and agent above'}
            </Button>

          </div>
        )}
      </div>
    </div>
  )
}

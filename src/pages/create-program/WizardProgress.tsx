import type { MessageParams, TranslationKey } from '../../i18n/types'

export type WizardPhase = 'name' | 'schema' | 'cards' | 'vocab' | 'done'

const PHASES: Array<{ id: WizardPhase; labelKey: TranslationKey }> = [
  { id: 'name', labelKey: 'createProgram.wizard.phaseName' },
  { id: 'schema', labelKey: 'createProgram.wizard.phaseSchema' },
  { id: 'cards', labelKey: 'createProgram.wizard.phaseCards' },
  { id: 'vocab', labelKey: 'createProgram.wizard.phaseVocab' },
  { id: 'done', labelKey: 'createProgram.wizard.phaseDone' },
]

export type WizardStepId =
  | 'name'
  | 'schema'
  | 'cardSetup'
  | 'sideEdit'
  | 'displayEdit'
  | 'vocabEntry'
  | 'done'

type WizardProgressProps = {
  current: WizardPhase
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function wizardPhaseFromStep(step: WizardStepId): WizardPhase {
  if (step === 'name') {
    return 'name'
  }
  if (step === 'schema') {
    return 'schema'
  }
  if (step === 'vocabEntry') {
    return 'vocab'
  }
  if (step === 'done') {
    return 'done'
  }
  return 'cards'
}

export function WizardProgress({ current, t }: WizardProgressProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === current)

  return (
    <nav aria-label={t('createProgram.wizard.progress')} className="mt-4 lg:mt-6">
      <ol className="flex items-center gap-0.5 sm:gap-1 lg:gap-2">
        {PHASES.map((phase, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          return (
            <li key={phase.id} className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
              <div
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 ${
                  active ? 'text-accent' : done ? 'text-text' : 'text-text-muted'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold lg:h-8 lg:w-8 lg:text-sm ${
                    active
                      ? 'bg-accent text-surface'
                      : done
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface-card text-text-muted'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="w-full truncate text-center text-[10px] leading-tight sm:text-xs lg:text-sm lg:leading-snug">
                  {t(phase.labelKey)}
                </span>
              </div>
              {index < PHASES.length - 1 && (
                <span
                  className={`mb-4 h-px w-1 shrink-0 sm:w-3 lg:mb-5 lg:w-6 ${
                    index < currentIndex ? 'bg-accent/50' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

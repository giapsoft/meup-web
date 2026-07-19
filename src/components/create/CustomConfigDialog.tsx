import { useEffect, useId } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ProgramConfigWeb } from '../../types/webConfig'
import { ProgramConfigWizard } from './ProgramConfigWizard'

type CustomConfigDialogProps = {
  open: boolean
  programName: string
  initialConfig: ProgramConfigWeb
  onClose: () => void
  onApply: (config: ProgramConfigWeb) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function CustomConfigDialog({
  open,
  programName,
  initialConfig,
  onClose,
  onApply,
  t,
}: CustomConfigDialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t('createProgram.customConfig.close')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-dvh max-h-dvh w-full max-w-6xl flex-col overflow-hidden border-border bg-surface-raised shadow-xl sm:h-auto sm:max-h-[min(92vh,56rem)] sm:rounded-2xl sm:border"
      >
        <div
          id={titleId}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-4 sm:pt-4"
        >
          <ProgramConfigWizard
            resetKey={open ? 'open' : 'closed'}
            initialConfig={initialConfig}
            programName={programName}
            t={t}
            showGenerateDescriptions
            finishLabel={t('createProgram.stepSchema.continue')}
            cancelLabel={t('createProgram.customConfig.close')}
            onCancel={onClose}
            onFinish={(config) => {
              onApply(config)
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}

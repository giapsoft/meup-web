import { useEffect, useState } from 'react'
import { App } from '../app/App'
import type { ProgramConfigWeb } from '../types/webConfig'
import { programConfigsEqual } from '../utils/programConfigCompare'

export function useAiCreateConfig() {
  const [programConfig, setProgramConfig] = useState<ProgramConfigWeb | null>(null)
  const [defaultConfig, setDefaultConfig] = useState<ProgramConfigWeb | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void App.get().config().then((cfg) => {
      if (cancelled) {
        return
      }
      const snapshot = structuredClone(cfg.defaultConfig)
      setProgramConfig(snapshot)
      setDefaultConfig(structuredClone(cfg.defaultConfig))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const configIsCustom =
    programConfig !== null && defaultConfig !== null
      ? !programConfigsEqual(programConfig, defaultConfig)
      : false

  return {
    programConfig,
    setProgramConfig,
    configDialogOpen,
    setConfigDialogOpen,
    configIsCustom,
    ready: programConfig !== null,
  }
}

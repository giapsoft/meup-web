import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  WEB_DEFAULT_PROGRAM_CONFIG_KEY,
  adminGenerateDescription,
  listAdminSystemConfig,
  updateAdminSystemConfig,
} from '../../api/admin'
import { ApiError } from '../../api/client'
import { ProgramConfigWizard } from '../../components/create/ProgramConfigWizard'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { LANGUAGES, findLanguage } from '../../data/mock'
import type { ProgramConfigWeb, SchemaAttrWeb } from '../../types/webConfig'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; config: ProgramConfigWeb; inDatabase: boolean }
  | { phase: 'error'; message: string }

function parseProgramConfigWeb(raw: string): ProgramConfigWeb | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('itemSchema' in parsed) ||
      !('levels' in parsed)
    ) {
      return null
    }
    return parsed as ProgramConfigWeb
  } catch {
    return null
  }
}

export function AdminDefaultProgramConfigPage() {
  const { t, nativeLang: sessionNative, studyLang: sessionStudy } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [resetKey, setResetKey] = useState(0)
  const [nativeLang, setNativeLang] = useState(sessionNative || 'vi')
  const [studyLang, setStudyLang] = useState(sessionStudy || 'en')
  const [saveBusy, setSaveBusy] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const studyLangLabel = findLanguage(studyLang)?.name ?? studyLang
  const nativeLangLabel = findLanguage(nativeLang)?.name ?? nativeLang

  const load = useCallback(async () => {
    if (!secret) {
      return
    }
    setLoadState({ phase: 'loading' })
    try {
      const entries = await listAdminSystemConfig(secret)
      const entry = entries.find((e) => e.key === WEB_DEFAULT_PROGRAM_CONFIG_KEY)
      if (!entry) {
        setLoadState({ phase: 'error', message: t('admin.defaultProgramConfig.missingKey') })
        return
      }
      const raw = entry.value.trim() || entry.defaultValue.trim()
      const config = parseProgramConfigWeb(raw)
      if (!config) {
        setLoadState({ phase: 'error', message: t('admin.defaultProgramConfig.parseError') })
        return
      }
      setLoadState({ phase: 'ready', config, inDatabase: entry.inDatabase })
      setResetKey((n) => n + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      const message =
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [secret, navigate, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toastMessage) {
      return
    }
    const id = window.setTimeout(() => setToastMessage(null), 3200)
    return () => window.clearTimeout(id)
  }, [toastMessage])

  const generateDescriptions = useCallback(
    async (attrs: SchemaAttrWeb[], opts?: { keys?: string[] }) => {
      if (!secret) {
        throw new ApiError(401, 'unauthorized')
      }
      const result = await adminGenerateDescription(secret, attrs, opts?.keys)
      return result.attrs
    },
    [secret],
  )

  const handleSave = useCallback(
    async (config: ProgramConfigWeb) => {
      if (!secret || saveBusy) {
        return
      }
      setSaveBusy(true)
      try {
        await updateAdminSystemConfig(secret, [
          { key: WEB_DEFAULT_PROGRAM_CONFIG_KEY, value: JSON.stringify(config) },
        ])
        setToastMessage(t('admin.defaultProgramConfig.saveSuccess'))
        setLoadState({ phase: 'ready', config, inDatabase: true })
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearAdminSecret()
          navigate('/admin', { replace: true })
          return
        }
        setToastMessage(
          err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
        )
      } finally {
        setSaveBusy(false)
      }
    },
    [secret, saveBusy, t, navigate],
  )

  const langOptions = useMemo(() => LANGUAGES, [])

  if (!secret) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-text">{t('admin.defaultProgramConfig.title')}</h2>
      <p className="mt-1 text-sm leading-relaxed text-text-muted">
        {t('admin.defaultProgramConfig.hint')}
      </p>

      <div className="mt-4 grid gap-3 rounded-xl border border-border bg-surface-raised p-3 sm:grid-cols-2 sm:p-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">
            {t('admin.defaultProgramConfig.nativeLang')}
          </span>
          <select
            value={nativeLang}
            onChange={(e) => setNativeLang(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"
          >
            {langOptions.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">
            {t('admin.defaultProgramConfig.studyLang')}
          </span>
          <select
            value={studyLang}
            onChange={(e) => setStudyLang(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"
          >
            {langOptions.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-text-muted sm:col-span-2">
          {t('admin.defaultProgramConfig.langHint')}
        </p>
      </div>

      {loadState.phase === 'loading' && (
        <p className="mt-4 text-sm text-text-muted">{t('admin.loading')}</p>
      )}
      {loadState.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
          <p>{loadState.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm text-text"
          >
            {t('admin.retryLoad')}
          </button>
        </div>
      )}
      {loadState.phase === 'ready' && (
        <>
          <p className="mt-3 text-xs text-text-muted">
            {loadState.inDatabase
              ? t('admin.config.modified')
              : t('admin.config.usingDefault')}{' '}
            · {WEB_DEFAULT_PROGRAM_CONFIG_KEY}
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-surface-raised p-4 sm:p-6">
            <ProgramConfigWizard
              resetKey={resetKey}
              initialConfig={loadState.config}
              programName={t('admin.defaultProgramConfig.programName')}
              t={t}
              showGenerateDescriptions
              generateDescriptions={generateDescriptions}
              studyLangLabel={studyLangLabel}
              nativeLangLabel={nativeLangLabel}
              finishLabel={
                saveBusy
                  ? t('admin.defaultProgramConfig.saving')
                  : t('admin.defaultProgramConfig.save')
              }
              finishDisabled={saveBusy}
              onFinish={(config) => void handleSave(config)}
            />
          </div>
        </>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[80] max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text shadow-xl"
        >
          {toastMessage}
        </div>
      )}
    </div>
  )
}

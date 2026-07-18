import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearAdminAppVersion,
  listAdminSystemConfig,
  publishAdminAppVersion,
} from '../../api/admin'
import { ApiError } from '../../api/client'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { clearAdminSecret } from '../../utils/adminSecretStorage'

const KEY_VERSION = 'APP_VERSION'
const KEY_PATH = 'APP_VERSION_PATH'
const KEY_SHA = 'APP_VERSION_SHA256'
const KEY_SIZE = 'APP_VERSION_FILE_SIZE'
const MAX_FILE_BYTES = 5_242_880

type CurrentFirmware = {
  version: string
  path: string
  sha256: string
  fileSize: string
}

function entryValue(
  entries: Array<{ key: string; value: string; defaultValue: string }>,
  key: string,
): string {
  const entry = entries.find((e) => e.key === key)
  return (entry?.value || entry?.defaultValue || '').trim()
}

function shortSha(sha: string): string {
  if (sha.length <= 16) {
    return sha || '—'
  }
  return `${sha.slice(0, 8)}…${sha.slice(-8)}`
}

type AdminFirmwarePanelProps = {
  secret: string
}

export function AdminFirmwarePanel({ secret }: AdminFirmwarePanelProps) {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const [current, setCurrent] = useState<CurrentFirmware | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<'publish' | 'clear' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)

  const handleAuthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return true
      }
      return false
    },
    [navigate],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const entries = await listAdminSystemConfig(secret)
      setCurrent({
        version: entryValue(entries, KEY_VERSION),
        path: entryValue(entries, KEY_PATH),
        sha256: entryValue(entries, KEY_SHA),
        fileSize: entryValue(entries, KEY_SIZE),
      })
    } catch (err) {
      if (handleAuthError(err)) {
        return
      }
      setLoadError(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setLoading(false)
    }
  }, [secret, handleAuthError, t])

  useEffect(() => {
    void load()
  }, [load])

  const handlePublish = async () => {
    const version = appVersion.trim()
    setMessage(null)
    if (!version || version.includes('/') || version.includes('\\') || /\s/.test(version)) {
      setMessageOk(false)
      setMessage(t('admin.firmware.error.invalidVersion'))
      return
    }
    if (!file || file.size <= 0) {
      setMessageOk(false)
      setMessage(t('admin.firmware.error.fileRequired'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessageOk(false)
      setMessage(t('admin.firmware.error.fileTooLarge'))
      return
    }

    setBusy('publish')
    try {
      const result = await publishAdminAppVersion(secret, { appVersion: version, file })
      setMessageOk(true)
      setMessage(
        t('admin.firmware.successPublish', {
          version: result.appVersion,
          size: String(result.fileSize),
        }),
      )
      setAppVersion('')
      setFile(null)
      await load()
    } catch (err) {
      if (handleAuthError(err)) {
        return
      }
      setMessageOk(false)
      if (err instanceof ApiError && err.code === 'file_too_large') {
        setMessage(t('admin.firmware.error.fileTooLarge'))
      } else {
        setMessage(
          err instanceof ApiError
            ? t('admin.errorCode', { code: err.code })
            : t('admin.errorGeneric'),
        )
      }
    } finally {
      setBusy(null)
    }
  }

  const handleClear = async () => {
    if (!window.confirm(t('admin.firmware.clearConfirm'))) {
      return
    }
    setBusy('clear')
    setMessage(null)
    try {
      await clearAdminAppVersion(secret)
      setMessageOk(true)
      setMessage(t('admin.firmware.successClear'))
      await load()
    } catch (err) {
      if (handleAuthError(err)) {
        return
      }
      setMessageOk(false)
      setMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setBusy(null)
    }
  }

  const otaActive = Boolean(current?.version)

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text">{t('admin.firmware.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('admin.firmware.hint')}</p>

        {loading ? (
          <p className="mt-4 text-sm text-text-muted">{t('admin.loading')}</p>
        ) : loadError ? (
          <p className="mt-4 text-sm text-warning" role="alert">
            {loadError}
          </p>
        ) : (
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-raised p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-text">{t('admin.firmware.current')}</span>
              <span
                className={[
                  'rounded-md border px-2 py-0.5 text-xs font-medium',
                  otaActive
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-border text-text-muted',
                ].join(' ')}
              >
                {otaActive ? t('admin.firmware.otaActive') : t('admin.firmware.otaInactive')}
              </span>
            </div>
            <p className="font-mono text-text">
              {t('admin.firmware.currentVersion')}: {current?.version || '—'}
            </p>
            <p className="break-all font-mono text-xs text-text-muted">
              {t('admin.firmware.currentPath')}: {current?.path || '—'}
            </p>
            <p className="font-mono text-xs text-text-muted">
              {t('admin.firmware.currentSize')}: {current?.fileSize || '—'}
            </p>
            <p className="font-mono text-xs text-text-muted">
              {t('admin.firmware.currentSha')}: {shortSha(current?.sha256 ?? '')}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">{t('admin.firmware.version')}</span>
          <input
            type="text"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            placeholder="1.0.1"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 font-mono text-sm text-text"
            disabled={busy !== null}
          />
        </label>
        <p className="mt-2 text-xs text-text-muted">{t('admin.firmware.versionMatchHint')}</p>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-text">{t('admin.firmware.file')}</span>
          <input
            type="file"
            accept=".bin,application/octet-stream"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-text"
            disabled={busy !== null}
          />
        </label>
        {file && (
          <p className="mt-1 text-xs text-text-muted">
            {file.name} · {file.size} bytes
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handlePublish()}
            className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
          >
            {busy === 'publish' ? t('admin.firmware.publishing') : t('admin.firmware.publish')}
          </button>
          <button
            type="button"
            disabled={busy !== null || !otaActive}
            onClick={() => void handleClear()}
            className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-text-muted transition hover:border-warning/40 hover:text-text disabled:opacity-60"
          >
            {busy === 'clear' ? t('admin.firmware.clearing') : t('admin.firmware.clear')}
          </button>
        </div>

        {message && (
          <p
            className={['mt-3 text-sm', messageOk ? 'text-accent' : 'text-warning'].join(' ')}
            role="status"
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

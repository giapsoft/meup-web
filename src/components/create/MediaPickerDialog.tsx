import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  generateProductCreateAudio,
  generateProductCreateImage,
  uploadProductCreateAudio,
  uploadProductCreateImage,
} from '../../api/productCreateMedia'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { MediaSlot } from '../../utils/itemSchemaLayout'
import { resolveMediaPlayUrl } from '../../utils/mediaPreviewCache'
import { acceptMimeForMediaSlot } from '../../utils/vocabMedia'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
} from '../../pages/create-program/wizardLayout'

export type MediaPickerDraft =
  | { kind: 'local'; file: File; previewUrl: string }
  | { kind: 'fetchedUrl'; sourceUrl: string; file: File; previewUrl: string }
  | { kind: 'server'; objectKey: string; previewUrl: string }

type MediaPickerDialogProps = {
  open: boolean
  slot: MediaSlot
  tempId: string
  currentObjectKey?: string
  currentPreviewUrl?: string
  generateText: string
  generateLang: string
  onClose: () => void
  onApply: (result: { objectKey: string; previewUrl: string }) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

type SourceTab = 'upload' | 'clipboard' | 'url' | 'generate'

function revokeDraftPreview(draft: MediaPickerDraft | null) {
  if (!draft) {
    return
  }
  if (draft.kind === 'local' || draft.kind === 'fetchedUrl') {
    URL.revokeObjectURL(draft.previewUrl)
  }
}

export function MediaPickerDialog({
  open,
  slot,
  tempId,
  currentObjectKey,
  currentPreviewUrl,
  generateText,
  generateLang,
  onClose,
  onApply,
  t,
}: MediaPickerDialogProps) {
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<SourceTab>('upload')
  const [draft, setDraft] = useState<MediaPickerDraft | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resolvedCurrentPreview, setResolvedCurrentPreview] = useState<string | undefined>(
    currentPreviewUrl,
  )

  useEffect(() => {
    if (!open) {
      return
    }
    setTab('upload')
    setDraft(null)
    setUrlInput('')
    setErrorMessage(null)
    setApplying(false)
    setGenerating(false)
  }, [open, slot.key])

  useEffect(() => {
    if (!open) {
      setResolvedCurrentPreview(undefined)
      return
    }
    if (currentPreviewUrl) {
      setResolvedCurrentPreview(currentPreviewUrl)
      return
    }
    const ref = currentObjectKey?.trim()
    if (!ref) {
      setResolvedCurrentPreview(undefined)
      return
    }
    let cancelled = false
    void resolveMediaPlayUrl(ref)
      .then((url) => {
        if (!cancelled) {
          setResolvedCurrentPreview(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedCurrentPreview(undefined)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, currentPreviewUrl, currentObjectKey])

  useEffect(() => {
    return () => revokeDraftPreview(draft)
  }, [draft])

  function setLocalDraft(file: File) {
    revokeDraftPreview(draft)
    const previewUrl = URL.createObjectURL(file)
    setDraft({ kind: 'local', file, previewUrl })
    setErrorMessage(null)
  }

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) {
      return
    }
    setLocalDraft(file)
  }

  async function handleClipboard() {
    setErrorMessage(null)
    try {
      const items = await navigator.clipboard.read()
      for (const clipItem of items) {
        for (const type of clipItem.types) {
          if (
            (slot.kind === 'image' && type.startsWith('image/')) ||
            (slot.kind === 'audio' && type.startsWith('audio/'))
          ) {
            const blob = await clipItem.getType(type)
            const ext = type.split('/')[1] ?? 'bin'
            const file = new File([blob], `clipboard.${ext}`, { type })
            setLocalDraft(file)
            return
          }
        }
      }
      setErrorMessage(t('createManual.mediaPicker.clipboardEmpty'))
    } catch {
      setErrorMessage(t('createManual.mediaPicker.clipboardFailed'))
    }
  }

  async function handleFetchUrl() {
    const url = urlInput.trim()
    if (!url) {
      setErrorMessage(t('createManual.mediaPicker.urlRequired'))
      return
    }
    setErrorMessage(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('fetch_failed')
      }
      const blob = await res.blob()
      const mime = blob.type || (slot.kind === 'image' ? 'image/jpeg' : 'audio/mpeg')
      if (slot.kind === 'image' && !mime.startsWith('image/')) {
        throw new Error('invalid_type')
      }
      if (slot.kind === 'audio' && !mime.startsWith('audio/')) {
        throw new Error('invalid_type')
      }
      const file = new File([blob], slot.kind === 'image' ? 'image.jpg' : 'audio.mp3', { type: mime })
      revokeDraftPreview(draft)
      const previewUrl = URL.createObjectURL(file)
      setDraft({ kind: 'fetchedUrl', sourceUrl: url, file, previewUrl })
    } catch {
      setErrorMessage(t('createManual.mediaPicker.urlFailed'))
    }
  }

  async function handleGenerate() {
    const text = generateText.trim()
    if (!text) {
      setErrorMessage(t('createManual.mediaPicker.generateTextRequired'))
      return
    }
    setGenerating(true)
    setErrorMessage(null)
    try {
      const result =
        slot.kind === 'image'
          ? await generateProductCreateImage({ tempId, text, lang: generateLang })
          : await generateProductCreateAudio({ tempId, text, lang: generateLang })
      revokeDraftPreview(draft)
      setDraft({ kind: 'server', objectKey: result.objectKey, previewUrl: result.previewUrl })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed'
      setErrorMessage(code)
    } finally {
      setGenerating(false)
    }
  }

  async function handleApply() {
    if (!draft) {
      return
    }
    setApplying(true)
    setErrorMessage(null)
    try {
      if (draft.kind === 'server') {
        onApply({ objectKey: draft.objectKey, previewUrl: draft.previewUrl })
        onClose()
        return
      }
      const file = draft.file
      const result =
        slot.kind === 'image'
          ? await uploadProductCreateImage(tempId, file)
          : await uploadProductCreateAudio(tempId, file)
      onApply({ objectKey: result.objectKey, previewUrl: result.previewUrl })
      onClose()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed'
      setErrorMessage(code)
    } finally {
      setApplying(false)
    }
  }

  if (!open) {
    return null
  }

  const draftPreview = draft?.previewUrl
  const canApply = draft !== null && !applying && !generating

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label={t('createManual.mediaPicker.close')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface-raised shadow-xl sm:rounded-2xl"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text">
            {slot.kind === 'image'
              ? t('createManual.mediaPicker.titleImage')
              : t('createManual.mediaPicker.titleAudio')}
          </h2>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t('createManual.mediaPicker.current')}
            </p>
            <div className="mt-2 flex min-h-[140px] items-center justify-center rounded-lg bg-surface-card">
              {resolvedCurrentPreview ? (
                slot.kind === 'image' ? (
                  <img src={resolvedCurrentPreview} alt="" className="max-h-36 max-w-full rounded object-contain" />
                ) : (
                  <audio controls src={resolvedCurrentPreview} className="w-full max-w-xs" />
                )
              ) : (
                <p className="text-sm text-text-muted">{t('createManual.mediaPicker.currentEmpty')}</p>
              )}
            </div>
            {currentObjectKey && (
              <p className="mt-2 truncate text-xs text-text-muted">{currentObjectKey}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t('createManual.mediaPicker.draft')}
            </p>
            <div className="mt-2 flex min-h-[140px] items-center justify-center rounded-lg bg-surface-card">
              {draftPreview ? (
                slot.kind === 'image' ? (
                  <img src={draftPreview} alt="" className="max-h-36 max-w-full rounded object-contain" />
                ) : (
                  <audio controls src={draftPreview} className="w-full max-w-xs" />
                )
              ) : (
                <p className="text-sm text-text-muted">{t('createManual.mediaPicker.draftEmpty')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {(['upload', 'clipboard', 'url', 'generate'] as SourceTab[]).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => setTab(source)}
                className={`min-h-9 rounded-lg border px-3 py-1.5 text-sm ${
                  tab === source
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:bg-surface-hover'
                }`}
              >
                {t(`createManual.mediaPicker.tab.${source}`)}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {tab === 'upload' && (
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm text-accent hover:border-accent"
                >
                  {t('createManual.mediaPicker.chooseFile')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptMimeForMediaSlot(slot)}
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files)}
                />
              </div>
            )}
            {tab === 'clipboard' && (
              <button
                type="button"
                onClick={() => void handleClipboard()}
                className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-surface-hover"
              >
                {t('createManual.mediaPicker.pasteClipboard')}
              </button>
            )}
            {tab === 'url' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t('createManual.mediaPicker.urlPlaceholder')}
                  className="min-h-10 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button
                  type="button"
                  onClick={() => void handleFetchUrl()}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-surface-hover"
                >
                  {t('createManual.mediaPicker.loadUrl')}
                </button>
              </div>
            )}
            {tab === 'generate' && (
              <div className="space-y-2">
                <p className="text-xs text-text-muted">{t('createManual.mediaPicker.generateHint')}</p>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating}
                  className="min-h-10 rounded-lg border border-border px-4 py-2 text-sm text-accent hover:border-accent disabled:opacity-50"
                >
                  {generating
                    ? t('createManual.mediaPicker.generating')
                    : draft?.kind === 'server'
                      ? t('createManual.mediaPicker.regenerate')
                      : t('createManual.mediaPicker.generate')}
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="mt-3 text-sm text-warning">{errorMessage}</p>
          )}
        </div>

        <div className={`${WIZARD_ACTIONS} border-t border-border px-4 py-3`}>
          <button type="button" onClick={onClose} className={WIZARD_ACTION_SECONDARY}>
            {t('createManual.mediaPicker.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={!canApply}
            className={`${WIZARD_ACTION_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {applying ? t('createManual.mediaPicker.applying') : t('createManual.mediaPicker.apply')}
          </button>
        </div>
      </div>
    </div>
  )
}

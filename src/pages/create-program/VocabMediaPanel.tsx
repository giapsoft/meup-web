import { useId, useRef, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, VocabItemDraft } from '../../types/program'
import {
  acceptMimeForMediaSlot,
  attachVocabItemMedia,
  detachVocabItemMedia,
  mediaSlotLabel,
  schemaMediaSlots,
} from '../../utils/vocabMedia'

type VocabMediaPanelProps = {
  schema: ItemSchema
  item: VocabItemDraft
  onItemsChange: (items: VocabItemDraft[]) => void
  items: VocabItemDraft[]
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function VocabMediaPanel({
  schema,
  item,
  items,
  onItemsChange,
  t,
}: VocabMediaPanelProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const previewDialogTitleId = useId()
  const [imagePreview, setImagePreview] = useState<{ url: string; label: string } | null>(null)
  const slots = schemaMediaSlots(schema)

  if (slots.length === 0) {
    return null
  }

  function pickFile(mediaKey: string) {
    fileInputRefs.current[mediaKey]?.click()
  }

  function handleFileChange(mediaKey: string, fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) {
      return
    }
    onItemsChange(attachVocabItemMedia(items, item.id, mediaKey, file))
  }

  function handleClear(mediaKey: string) {
    onItemsChange(detachVocabItemMedia(items, item.id, mediaKey))
    const input = fileInputRefs.current[mediaKey]
    if (input) {
      input.value = ''
    }
  }

  function handlePlay(mediaKey: string) {
    const url = item.media?.[mediaKey]?.objectUrl
    if (!url) {
      return
    }
    const audio = new Audio(url)
    void audio.play()
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-card p-3">
        <p className="text-sm font-medium text-text">{t('createProgram.stepVocab.mediaTitle')}</p>
        <p className="mt-1 text-xs text-text-muted">{t('createProgram.stepVocab.mediaHint')}</p>
        <ul className="mt-3 space-y-3">
          {slots.map((slot) => {
            const media = item.media?.[slot.key]
            const label = mediaSlotLabel(slot, schema)
            return (
              <li
                key={slot.key}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{label}</p>
                  {media ? (
                    <p className="mt-0.5 truncate text-xs text-text-muted">{media.file.name}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-text-muted">
                      {t('createProgram.stepVocab.mediaEmpty')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pickFile(slot.key)}
                    className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-accent hover:border-accent"
                  >
                    {media
                      ? t('createProgram.stepVocab.mediaReplace')
                      : t('createProgram.stepVocab.mediaChoose')}
                  </button>
                  {slot.kind === 'audio' && media && (
                    <button
                      type="button"
                      onClick={() => handlePlay(slot.key)}
                      className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
                      aria-label={t('createProgram.stepVocab.mediaPlay')}
                    >
                      ▶ {t('createProgram.stepVocab.mediaPlay')}
                    </button>
                  )}
                  {slot.kind === 'image' && media && (
                    <button
                      type="button"
                      onClick={() => setImagePreview({ url: media.objectUrl, label })}
                      className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
                    >
                      {t('createProgram.stepVocab.mediaPreview')}
                    </button>
                  )}
                  {media && (
                    <button
                      type="button"
                      onClick={() => handleClear(slot.key)}
                      className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      {t('createProgram.stepVocab.mediaClear')}
                    </button>
                  )}
                  <input
                    ref={(node) => {
                      fileInputRefs.current[slot.key] = node
                    }}
                    type="file"
                    accept={acceptMimeForMediaSlot(slot)}
                    className="hidden"
                    onChange={(e) => handleFileChange(slot.key, e.target.files)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {imagePreview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setImagePreview(null)}
            aria-label={t('createProgram.stepVocab.mediaPreviewClose')}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={previewDialogTitleId}
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-surface-raised shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 id={previewDialogTitleId} className="truncate text-sm font-semibold text-text">
                {imagePreview.label}
              </h3>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-surface-hover"
              >
                {t('createProgram.stepVocab.mediaPreviewClose')}
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-3.5rem)] items-center justify-center bg-black/20 p-4">
              <img
                src={imagePreview.url}
                alt=""
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

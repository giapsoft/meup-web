import { useId, useRef, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaAttribute, VocabItemDraft } from '../../types/program'
import {
  acceptMimeForAttribute,
  attachVocabItemMedia,
  detachVocabItemMedia,
  mediaAttributeLabel,
  schemaMediaAttributes,
} from '../../utils/vocabMedia'

type VocabMediaPanelProps = {
  attributes: ItemSchemaAttribute[]
  item: VocabItemDraft
  onItemsChange: (items: VocabItemDraft[]) => void
  items: VocabItemDraft[]
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function VocabMediaPanel({
  attributes,
  item,
  items,
  onItemsChange,
  t,
}: VocabMediaPanelProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const previewDialogTitleId = useId()
  const [imagePreview, setImagePreview] = useState<{ url: string; label: string } | null>(null)
  const mediaAttrs = schemaMediaAttributes(attributes)

  if (mediaAttrs.length === 0) {
    return null
  }

  function pickFile(attrKey: string) {
    fileInputRefs.current[attrKey]?.click()
  }

  function handleFileChange(attr: ItemSchemaAttribute, fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) {
      return
    }
    onItemsChange(attachVocabItemMedia(items, item.id, attr.key, file))
  }

  function handleClear(attrKey: string) {
    onItemsChange(detachVocabItemMedia(items, item.id, attrKey))
    const input = fileInputRefs.current[attrKey]
    if (input) {
      input.value = ''
    }
  }

  function handlePlay(attrKey: string) {
    const url = item.media?.[attrKey]?.objectUrl
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
          {mediaAttrs.map((attr) => {
            const media = item.media?.[attr.key]
            const label = mediaAttributeLabel(attr, attributes, t('createProgram.fieldType.audio'))
            return (
              <li
                key={attr.key}
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
                    onClick={() => pickFile(attr.key)}
                    className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-accent hover:border-accent"
                  >
                    {media
                      ? t('createProgram.stepVocab.mediaReplace')
                      : t('createProgram.stepVocab.mediaChoose')}
                  </button>
                  {attr.type === 'audio' && media && (
                    <button
                      type="button"
                      onClick={() => handlePlay(attr.key)}
                      className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
                      aria-label={t('createProgram.stepVocab.mediaPlay')}
                    >
                      ▶ {t('createProgram.stepVocab.mediaPlay')}
                    </button>
                  )}
                  {attr.type === 'image' && media && (
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
                      onClick={() => handleClear(attr.key)}
                      className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      {t('createProgram.stepVocab.mediaClear')}
                    </button>
                  )}
                  <input
                    ref={(node) => {
                      fileInputRefs.current[attr.key] = node
                    }}
                    type="file"
                    accept={acceptMimeForAttribute(attr)}
                    className="hidden"
                    onChange={(e) => handleFileChange(attr, e.target.files)}
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

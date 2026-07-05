import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, VocabItemDraft } from '../../types/program'
import {
  addVocabItem,
  removeVocabItem,
  textAttrs,
  updateVocabItemValue,
} from '../../utils/vocabItems'
import {
  attachServerMedia,
  audioMediaValueKey,
  getStagedMedia,
  mediaValueKey,
} from '../../utils/manualMedia'
import { mediaSlots, type MediaSlot } from '../../utils/itemSchemaLayout'
import { VocabCsvImportBar } from '../../pages/create-program/VocabCsvImportBar'
import { MediaPickerDialog } from './MediaPickerDialog'

type MediaPickerState = {
  itemId: string
  slot: MediaSlot
  generateText: string
  generateLang: string
}

function langForAttr(
  attrLang: string | undefined,
  nativeLang: string,
  studyLang: string,
): string {
  if (attrLang === 'native') {
    return nativeLang
  }
  return studyLang
}

function hasAttachedMedia(item: VocabItemDraft, valueKey: string): boolean {
  return Boolean(getStagedMedia(item, valueKey)) || Boolean(item.values[valueKey]?.trim())
}

function audioPreviewUrl(item: VocabItemDraft, textAttrKey: string): string | undefined {
  return getStagedMedia(item, audioMediaValueKey(textAttrKey))?.previewUrl
}

type MediaAttachButtonProps = {
  slot: MediaSlot
  item: VocabItemDraft
  onOpen: () => void
  t: VocabEntryTableProps['t']
}

function MediaIcon({ kind, attached }: { kind: 'audio' | 'image'; attached: boolean }) {
  const className = 'h-[18px] w-[18px] shrink-0'
  if (kind === 'audio') {
    if (attached) {
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M11 5 6 9H3v6h3l5 4V5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 8.5a4.5 4.5 0 0 1 0 7M18.5 5.5a8.5 8.5 0 0 1 0 13"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      )
    }
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
        <path
          d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path d="M19 5v6M16 8h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }

  if (attached) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="8.5" cy="10" r="1.75" fill="currentColor" />
        <path
          d="m3 16 5.5-5.5L14 16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.5" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m3 16 5.5-5.5L14 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 5v6M16 8h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  const className = 'h-[18px] w-[18px] shrink-0'
  if (playing) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  )
}

function MediaAttachButton({ slot, item, onOpen, t }: MediaAttachButtonProps) {
  const valueKey = mediaValueKey(slot)
  const staged = getStagedMedia(item, valueKey)
  const hasMedia = hasAttachedMedia(item, valueKey)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs ${
        hasMedia
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border text-text-muted hover:border-accent hover:text-accent'
      }`}
      aria-label={
        slot.kind === 'image' ? t('createManual.vocab.addImage') : t('createManual.vocab.addAudio')
      }
      title={
        slot.kind === 'image' ? t('createManual.vocab.addImage') : t('createManual.vocab.addAudio')
      }
    >
      {staged?.previewUrl && slot.kind === 'image' ? (
        <img src={staged.previewUrl} alt="" className="h-6 w-6 rounded object-cover" />
      ) : (
        <MediaIcon kind={slot.kind} attached={hasMedia} />
      )}
    </button>
  )
}

export type VocabEntryTableProps = {
  programName: string
  schema: ItemSchema
  items: VocabItemDraft[]
  onItemsChange: (items: VocabItemDraft[]) => void
  tempId: string
  nativeLang: string
  studyLang: string
  t: (key: TranslationKey, params?: MessageParams) => string
  footer?: ReactNode
}

export function VocabEntryTable({
  programName,
  schema,
  items,
  onItemsChange,
  tempId,
  nativeLang,
  studyLang,
  t,
  footer,
}: VocabEntryTableProps) {
  const textFields = useMemo(() => textAttrs(schema), [schema])
  const imageSlot = useMemo(() => mediaSlots(schema).find((slot) => slot.kind === 'image'), [schema])
  const audioSlotByTextKey = useMemo(() => {
    const map = new Map<string, MediaSlot>()
    for (const slot of mediaSlots(schema)) {
      if (slot.kind === 'audio' && slot.textKey) {
        map.set(slot.textKey, slot)
      }
    }
    return map
  }, [schema])
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null)
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function stopAudioPlayback() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingAudioKey(null)
  }

  function toggleAudioPlayback(playKey: string, previewUrl: string) {
    if (playingAudioKey === playKey && audioRef.current && !audioRef.current.paused) {
      stopAudioPlayback()
      return
    }
    audioRef.current?.pause()
    const audio = new Audio(previewUrl)
    audioRef.current = audio
    audio.onended = () => {
      if (audioRef.current === audio) {
        setPlayingAudioKey(null)
        audioRef.current = null
      }
    }
    void audio.play().then(() => setPlayingAudioKey(playKey)).catch(() => {
      if (audioRef.current === audio) {
        stopAudioPlayback()
      }
    })
  }

  function updateCell(itemId: string, key: string, value: string) {
    onItemsChange(updateVocabItemValue(items, itemId, key, value))
  }

  function handleAddRow() {
    onItemsChange(addVocabItem(items, schema))
  }

  function handleRemoveRow(itemId: string) {
    onItemsChange(removeVocabItem(items, itemId))
  }

  function openMediaPicker(item: VocabItemDraft, slot: MediaSlot) {
    const textKey = slot.textKey ?? slot.key
    const attr = schema.attrs.find((a) => a.key === textKey)
    const generateText = item.values[textKey]?.trim() || programName.trim()
    const generateLang = langForAttr(attr?.langType, nativeLang, studyLang)
    setMediaPicker({ itemId: item.id, slot, generateText, generateLang })
  }

  const pickerItem = mediaPicker ? items.find((i) => i.id === mediaPicker.itemId) : undefined
  const pickerValueKey = mediaPicker ? mediaValueKey(mediaPicker.slot) : ''
  const pickerStaged = pickerItem && pickerValueKey ? getStagedMedia(pickerItem, pickerValueKey) : undefined
  const pickerObjectKey = pickerStaged?.objectKey ?? (pickerItem ? pickerItem.values[pickerValueKey] : undefined)

  return (
    <>
      <VocabCsvImportBar
        programName={programName}
        schema={schema}
        items={items}
        onItemsChange={onItemsChange}
        onImported={() => {}}
        t={t}
      />

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-card text-left text-xs text-text-muted">
              <th className="w-10 px-2 py-2 font-medium">#</th>
              {textFields.map((attr) => (
                <th key={attr.key} className="min-w-[140px] px-2 py-2 font-medium">
                  {attr.name}
                </th>
              ))}
              {imageSlot && (
                <th className="min-w-[56px] px-2 py-2 font-medium">
                  {t('createManual.vocab.addImage')}
                </th>
              )}
              <th className="w-12 px-2 py-2" aria-label={t('createProgram.stepVocab.removeRow')} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIndex) => (
              <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover/40">
                <td className="px-2 py-2 text-xs text-text-muted">{rowIndex + 1}</td>
                {textFields.map((attr) => {
                  const audioSlot = audioSlotByTextKey.get(attr.key)
                  const audioValueKey = audioSlot ? audioMediaValueKey(attr.key) : ''
                  const hasAudio = audioSlot ? hasAttachedMedia(item, audioValueKey) : false
                  const previewUrl = audioSlot ? audioPreviewUrl(item, attr.key) : undefined
                  const playKey = audioSlot ? `${item.id}:${audioValueKey}` : ''
                  const isPlaying = playingAudioKey === playKey

                  return (
                    <td key={attr.key} className="px-2 py-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <input
                          type="text"
                          value={item.values[attr.key] ?? ''}
                          onChange={(e) => updateCell(item.id, attr.key, e.target.value)}
                          placeholder={attr.name}
                          className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                        />
                        {audioSlot && (
                          <>
                            <MediaAttachButton
                              slot={audioSlot}
                              item={item}
                              onOpen={() => openMediaPicker(item, audioSlot)}
                              t={t}
                            />
                            {hasAudio && previewUrl && (
                              <button
                                type="button"
                                onClick={() => toggleAudioPlayback(playKey, previewUrl)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-xs text-text-muted hover:border-accent hover:text-accent"
                                aria-label={
                                  isPlaying
                                    ? t('createProgram.stepVocab.mediaPause')
                                    : t('createProgram.stepVocab.mediaPlay')
                                }
                                title={
                                  isPlaying
                                    ? t('createProgram.stepVocab.mediaPause')
                                    : t('createProgram.stepVocab.mediaPlay')
                                }
                              >
                                <PlayPauseIcon playing={isPlaying} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )
                })}
                {imageSlot && (
                  <td className="px-2 py-1">
                    <MediaAttachButton
                      slot={imageSlot}
                      item={item}
                      onOpen={() => openMediaPicker(item, imageSlot)}
                      t={t}
                    />
                  </td>
                )}
                <td className="px-2 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(item.id)}
                    className="rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10"
                    aria-label={t('createProgram.stepVocab.removeRow')}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="mt-3 w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-accent hover:border-accent"
      >
        + {t('createProgram.stepVocab.addRow')}
      </button>

      {footer}

      {mediaPicker && pickerItem && (
        <MediaPickerDialog
          open
          slot={mediaPicker.slot}
          tempId={tempId}
          currentObjectKey={pickerObjectKey}
          currentPreviewUrl={pickerStaged?.previewUrl}
          generateText={mediaPicker.generateText}
          generateLang={mediaPicker.generateLang}
          onClose={() => setMediaPicker(null)}
          onApply={(result) => {
            onItemsChange(attachServerMedia(items, mediaPicker.itemId, pickerValueKey, result))
            setMediaPicker(null)
          }}
          t={t}
        />
      )}
    </>
  )
}

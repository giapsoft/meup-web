import type { TranslationKey } from '../../i18n/types'

export function previewTapHintKey(isWideLayout: boolean): TranslationKey {
  return isWideLayout ? 'createProgram.preview.clickToEdit' : 'createProgram.preview.tapToEdit'
}

export function previewDragHintKey(isWideLayout: boolean): TranslationKey {
  return isWideLayout ? 'createProgram.preview.dragHintDesktop' : 'createProgram.preview.dragHint'
}

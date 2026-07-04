import type { CreateProductJob } from '../api/productCreate'
import { App } from '../app/App'

export type VocabJobSource = 'fromTitle' | 'fromParagraph' | 'fromImage'

export function buildVocabJob(source: VocabJobSource, content: string, limitCount: number): CreateProductJob {
  const payload =
    source === 'fromImage' ? content : content.trim()
  return {
    type: 'vocab',
    content: JSON.stringify({ source, content: payload }),
    limitCount,
  }
}

export function estimateVocabJobCredits(limitCount: number): number {
  return App.get().vocabPrice() * Math.max(1, limitCount)
}

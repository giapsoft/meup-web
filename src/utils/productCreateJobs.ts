import type { CreateProductJob } from '../api/productCreate'

export type VocabJobSource = 'fromTitle' | 'fromParagraph' | 'fromImage'

/** Default unit price from API `JOB_PRICE` — for UI estimates only. */
export const VOCAB_JOB_CREDITS_PER_UNIT = 500

export function buildVocabJob(source: VocabJobSource, content: string, limitCount: number): CreateProductJob {
  return {
    type: 'vocab',
    content: JSON.stringify({ source, content: content.trim() }),
    limitCount,
  }
}

export function estimateVocabJobCredits(limitCount: number): number {
  return VOCAB_JOB_CREDITS_PER_UNIT * Math.max(1, limitCount)
}

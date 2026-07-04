import type { ProgramConfigWeb } from '../types/webConfig'

export function programConfigsEqual(a: ProgramConfigWeb, b: ProgramConfigWeb): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

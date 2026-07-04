import { fetchWebConfig } from '../api/webConfig'
import type { WebConfig } from '../types/webConfig'

const FALLBACK_CONFIG: WebConfig = {
  defaultConfig: {
    itemSchema: { hasImage: true, attrs: [] },
    levels: [],
  },
  vocabPrice: 500,
  audioPrice: 100,
  imagePrice: 500,
  descriptionPrice: 500,
  itemMinCount: 20,
  itemMaxCount: 1000,
}

function cloneConfig(cfg: WebConfig): WebConfig {
  return structuredClone(cfg)
}

class App {
  private static _internal = new App()

  static get(): App {
    return App._internal
  }

  static onUserLogout(): void {
    App._internal = new App()
  }

  private _config: WebConfig | null = null
  private _configPromise: Promise<WebConfig> | null = null

  studyLangCode = ''
  nativeLangCode = ''
  studyLangName = ''
  nativeLangName = ''

  /** Load once, cache in RAM; returns a deep copy. */
  async config(): Promise<WebConfig> {
    if (this._config) {
      return cloneConfig(this._config)
    }
    if (!this._configPromise) {
      this._configPromise = fetchWebConfig()
        .then((dto) => {
          this._config = dto
          return dto
        })
        .catch(() => {
          this._config = cloneConfig(FALLBACK_CONFIG)
          return this._config
        })
    }
    const loaded = await this._configPromise
    return cloneConfig(loaded)
  }

  /** Sync read after first successful load; null until then. */
  cachedConfig(): WebConfig | null {
    return this._config ? cloneConfig(this._config) : null
  }

  vocabPrice(): number {
    return this._config?.vocabPrice ?? FALLBACK_CONFIG.vocabPrice
  }

  audioPrice(): number {
    return this._config?.audioPrice ?? FALLBACK_CONFIG.audioPrice
  }

  imagePrice(): number {
    return this._config?.imagePrice ?? FALLBACK_CONFIG.imagePrice
  }

  descriptionPrice(): number {
    return this._config?.descriptionPrice ?? FALLBACK_CONFIG.descriptionPrice
  }

  itemMinCount(): number {
    return this._config?.itemMinCount ?? FALLBACK_CONFIG.itemMinCount
  }

  itemMaxCount(): number {
    return this._config?.itemMaxCount ?? FALLBACK_CONFIG.itemMaxCount
  }

  validateItemCount(value: number): 'insufficient' | 'too_many' | null {
    const min = this.itemMinCount()
    const max = this.itemMaxCount()
    if (value < min) {
      return 'insufficient'
    }
    if (value > max) {
      return 'too_many'
    }
    return null
  }
}

export { App }

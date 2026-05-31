/** Shared Tailwind class strings for create-program wizard responsive layout. */
export const WIZARD_MAIN =
  'mx-auto w-full max-w-lg px-4 py-8 sm:px-6 sm:py-10 md:max-w-3xl lg:max-w-6xl lg:px-8 lg:py-12'

export const WIZARD_STEP_SECTION =
  'mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6 lg:p-8'

/** Centered column for simple steps (name, schema, done). */
export const WIZARD_NARROW_SECTION = `${WIZARD_STEP_SECTION} lg:mx-auto lg:max-w-2xl`

export const WIZARD_PREVIEW_COLUMN =
  'sticky top-2 z-10 -mx-1 rounded-xl bg-surface-raised/95 px-1 py-2 backdrop-blur-sm lg:top-6 lg:mx-0 lg:self-start lg:px-0 lg:py-0'

export const WIZARD_EDITOR_GRID =
  'mt-4 lg:mt-6 lg:grid lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-10'

export const WIZARD_FORM_COLUMN = 'mt-5 space-y-3 lg:mt-0'

export const WIZARD_LAYOUT_SLIDERS = 'space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0'

export const WIZARD_COLOR_GRID = 'grid gap-3 sm:grid-cols-2'

export const WIZARD_ACTIONS =
  'mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:mt-8'

export const WIZARD_ACTION_PRIMARY =
  'min-h-12 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:opacity-90 sm:w-auto sm:min-w-[10rem]'

export const WIZARD_ACTION_SECONDARY =
  'min-h-12 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-medium text-text-muted transition hover:bg-surface-hover sm:w-auto sm:min-w-[10rem]'

export const WIZARD_ACTION_DANGER =
  'min-h-11 w-full rounded-xl border border-dashed border-border px-3 py-3 text-sm text-red-400 transition hover:border-red-400 sm:mr-auto sm:w-auto'

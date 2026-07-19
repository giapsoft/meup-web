import type { TranslationKey } from '../../i18n/types'

export type AdminUserTargetDraft = {
  userId: string
  email: string
  deviceOrderInput: string
}

export type AdminUserTargetBody = {
  userIds?: string[]
  emails?: string[]
  deviceOrders?: number[]
}

type AdminUserTargetFieldsProps = {
  draft: AdminUserTargetDraft
  onChange: (next: AdminUserTargetDraft) => void
  disabled?: boolean
  idPrefix: string
  t: (key: TranslationKey) => string
}

export function parseAdminUserTargets(
  draft: AdminUserTargetDraft,
  t: (key: TranslationKey) => string,
): { ok: true; body: AdminUserTargetBody } | { ok: false; message: string } {
  const userId = draft.userId.trim()
  const trimmedEmail = draft.email.trim()
  const orderRaw = draft.deviceOrderInput.trim()
  const deviceOrders: number[] = []

  if (orderRaw) {
    const order = Number.parseInt(orderRaw, 10)
    if (!Number.isFinite(order) || order <= 0) {
      return { ok: false, message: t('admin.credits.validation.deviceOrderInvalid') }
    }
    deviceOrders.push(order)
  }

  if (!userId && !trimmedEmail && deviceOrders.length === 0) {
    return { ok: false, message: t('admin.credits.validation.targetRequired') }
  }

  return {
    ok: true,
    body: {
      userIds: userId ? [userId] : undefined,
      emails: trimmedEmail ? [trimmedEmail] : undefined,
      deviceOrders: deviceOrders.length > 0 ? deviceOrders : undefined,
    },
  }
}

export function AdminUserTargetFields({
  draft,
  onChange,
  disabled,
  idPrefix,
  t,
}: AdminUserTargetFieldsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">{t('admin.credits.targetHint')}</p>
      <label className="block text-sm" htmlFor={`${idPrefix}-user-id`}>
        <span className="mb-1 block font-medium text-text">{t('admin.credits.userId')}</span>
        <input
          id={`${idPrefix}-user-id`}
          value={draft.userId}
          onChange={(e) => onChange({ ...draft, userId: e.target.value })}
          disabled={disabled}
          placeholder={t('admin.credits.userIdPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono text-text disabled:opacity-60"
        />
      </label>
      <label className="block text-sm" htmlFor={`${idPrefix}-email`}>
        <span className="mb-1 block font-medium text-text">{t('admin.credits.email')}</span>
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={draft.email}
          onChange={(e) => onChange({ ...draft, email: e.target.value })}
          disabled={disabled}
          placeholder={t('admin.credits.emailPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-60"
        />
      </label>
      <label className="block text-sm" htmlFor={`${idPrefix}-device-order`}>
        <span className="mb-1 block font-medium text-text">{t('admin.credits.deviceOrder')}</span>
        <input
          id={`${idPrefix}-device-order`}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.deviceOrderInput}
          onChange={(e) => onChange({ ...draft, deviceOrderInput: e.target.value })}
          disabled={disabled}
          placeholder={t('admin.credits.deviceOrderPlaceholder')}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums text-text disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-text-muted">{t('admin.credits.deviceOrderHint')}</p>
      </label>
    </div>
  )
}

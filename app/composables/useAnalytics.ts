type AnalyticsValue = string | number | boolean | null | undefined

type AnalyticsPayload = Record<string, AnalyticsValue>

type UmamiTracker = {
  track: (eventName: string, eventData?: Record<string, string | number | boolean | null>) => void
}

const MAX_EVENT_NAME_LENGTH = 50

function sanitizePayload(payload?: AnalyticsPayload): Record<string, string | number | boolean | null> | undefined {
  if (!payload) return undefined

  const sanitized = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean | null>

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

export function useAnalytics() {
  function track(eventName: string, payload?: AnalyticsPayload) {
    if (!import.meta.client || import.meta.dev) return

    const normalizedName = eventName.trim().slice(0, MAX_EVENT_NAME_LENGTH)
    if (!normalizedName) return

    const umami = (window as Window & { umami?: UmamiTracker }).umami
    if (!umami?.track) return

    umami.track(normalizedName, sanitizePayload(payload))
  }

  return { track }
}

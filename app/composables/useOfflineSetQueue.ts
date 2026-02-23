import type { SetInsert, SetUpdate } from '~/types/database'

type SetQueueOperation = 'create' | 'update' | 'remove'

interface CreateSetPayload {
  data: Omit<SetInsert, 'user_id'>
}

interface UpdateSetPayload {
  setId: string
  data: SetUpdate
}

interface RemoveSetPayload {
  setId: string
}

type SetQueuePayload = CreateSetPayload | UpdateSetPayload | RemoveSetPayload

interface OfflineSetQueueItem {
  id: string
  userId: string
  operation: SetQueueOperation
  createdAt: string
  payload: SetQueuePayload
}

const STORAGE_KEY = 'my-lifts:offline-set-queue:v1'

function isClient() {
  return import.meta.client
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readQueue(): OfflineSetQueueItem[] {
  if (!isClient()) return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is OfflineSetQueueItem => {
      return isRecord(item)
        && typeof item.id === 'string'
        && typeof item.userId === 'string'
        && typeof item.operation === 'string'
        && typeof item.createdAt === 'string'
        && isRecord(item.payload)
    })
  } catch {
    return []
  }
}

function writeQueue(queue: OfflineSetQueueItem[]) {
  if (!isClient()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

function makeId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function hasNetworkError(error: unknown): boolean {
  if (!isClient()) return false
  if (!navigator.onLine) return true

  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  return normalized.includes('network')
    || normalized.includes('failed to fetch')
    || normalized.includes('fetch failed')
}

export function useOfflineSetQueue() {
  const supabase = useSupabase()

  const pendingCount = useState<number>('offline-sets-pending-count', () => 0)
  const syncing = useState<boolean>('offline-sets-syncing', () => false)
  const lastSyncError = useState<string | null>('offline-sets-last-sync-error', () => null)

  const refreshPendingSetCount = (userId?: string) => {
    const queue = readQueue()
    pendingCount.value = userId
      ? queue.filter(item => item.userId === userId).length
      : queue.length

    return pendingCount.value
  }

  const enqueueCreateSet = (userId: string, data: Omit<SetInsert, 'user_id'>) => {
    const queue = readQueue()

    const item: OfflineSetQueueItem = {
      id: makeId(),
      userId,
      operation: 'create',
      createdAt: new Date().toISOString(),
      payload: { data }
    }

    queue.push(item)
    writeQueue(queue)
    refreshPendingSetCount(userId)

    return item
  }

  const enqueueUpdateSet = (userId: string, setId: string, data: SetUpdate) => {
    const queue = readQueue()

    for (let index = queue.length - 1; index >= 0; index--) {
      const item = queue[index]
      if (!item) continue

      if (item.userId !== userId || item.operation !== 'update') continue

      const payload = item.payload as UpdateSetPayload
      if (payload.setId === setId) {
        item.payload = {
          setId,
          data: {
            ...payload.data,
            ...data
          }
        }

        writeQueue(queue)
        refreshPendingSetCount(userId)

        return item
      }
    }

    const item: OfflineSetQueueItem = {
      id: makeId(),
      userId,
      operation: 'update',
      createdAt: new Date().toISOString(),
      payload: { setId, data }
    }

    queue.push(item)
    writeQueue(queue)
    refreshPendingSetCount(userId)

    return item
  }

  const enqueueRemoveSet = (userId: string, setId: string) => {
    const queue = readQueue()

    const compacted = queue.filter((item) => {
      if (item.userId !== userId) return true

      if (item.operation === 'update') {
        const payload = item.payload as UpdateSetPayload
        if (payload.setId === setId) {
          return false
        }
      }

      return true
    })

    const item: OfflineSetQueueItem = {
      id: makeId(),
      userId,
      operation: 'remove',
      createdAt: new Date().toISOString(),
      payload: { setId }
    }

    compacted.push(item)
    writeQueue(compacted)
    refreshPendingSetCount(userId)

    return item
  }

  const syncPendingSets = async (userId: string) => {
    if (!isClient()) {
      return { synced: 0, failed: 0, pending: 0 }
    }

    if (syncing.value || !navigator.onLine) {
      const pending = refreshPendingSetCount(userId)
      return { synced: 0, failed: 0, pending }
    }

    syncing.value = true
    lastSyncError.value = null

    try {
      const queue = readQueue()
      const pendingItems = queue.filter(item => item.userId === userId)
      const remainingItems = queue.filter(item => item.userId !== userId)

      let synced = 0
      let failed = 0

      for (let index = 0; index < pendingItems.length; index++) {
        const item = pendingItems[index]
        if (!item) continue

        try {
          if (item.operation === 'create') {
            const payload = item.payload as CreateSetPayload

            const { error } = await supabase
              .from('sets')
              .insert({
                ...payload.data,
                user_id: userId
              })

            if (error) throw error
          }

          if (item.operation === 'update') {
            const payload = item.payload as UpdateSetPayload

            const { error } = await supabase
              .from('sets')
              .update(payload.data)
              .eq('id', payload.setId)
              .eq('user_id', userId)

            if (error) throw error
          }

          if (item.operation === 'remove') {
            const payload = item.payload as RemoveSetPayload

            const { error } = await supabase
              .from('sets')
              .delete()
              .eq('id', payload.setId)
              .eq('user_id', userId)

            if (error) throw error
          }

          synced++
        } catch (error) {
          failed++
          remainingItems.push(item)

          if (hasNetworkError(error)) {
            remainingItems.push(...pendingItems.slice(index + 1))
            break
          }

          lastSyncError.value = error instanceof Error
            ? error.message
            : 'Error al sincronizar sets pendientes'
        }
      }

      writeQueue(remainingItems)
      const pending = refreshPendingSetCount(userId)

      if (synced > 0) {
        await refreshNuxtData('user-sets')
      }

      return { synced, failed, pending }
    } finally {
      syncing.value = false
    }
  }

  const clearPendingSets = (userId?: string) => {
    if (!isClient()) return

    if (!userId) {
      writeQueue([])
      refreshPendingSetCount()
      return
    }

    const queue = readQueue().filter(item => item.userId !== userId)
    writeQueue(queue)
    refreshPendingSetCount(userId)
  }

  return {
    pendingCount: computed(() => pendingCount.value),
    syncing: computed(() => syncing.value),
    lastSyncError: computed(() => lastSyncError.value),
    refreshPendingSetCount,
    enqueueCreateSet,
    enqueueUpdateSet,
    enqueueRemoveSet,
    syncPendingSets,
    clearPendingSets
  }
}

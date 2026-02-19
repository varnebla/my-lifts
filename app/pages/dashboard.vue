<script setup lang="ts">
import type { SetWithExercise } from '~/types/database'

definePageMeta({
  middleware: 'auth'
})

const { userName, userEmail, userAvatar } = useAuth()
const { calculatePRs, sortByLatestSet } = usePRs()
const { calculate: calculate1RM } = use1RM()
const { calculateWeeklyComparison, filterLastNDays, formatVolume } = useStats()
const { track } = useAnalytics()
const toast = useToast()

useSeoMeta({
  title: 'Dashboard | My Lifts',
  description: 'Consulta tus últimos records, estadísticas semanales e historial reciente en tu dashboard de My Lifts.',
  ogTitle: 'Dashboard | My Lifts',
  ogDescription: 'Consulta tus últimos records, estadísticas semanales e historial reciente en tu dashboard de My Lifts.'
})

// Fetch sets with caching across navigation
const { data: sets, status, error, refetch } = await useSetsData()

const loading = computed(() => status.value === 'pending')

// Mutations for create, update, delete
const { remove } = useSetMutations(sets)

// Modal state
const showModal = ref(false)
const editingSet = ref<SetWithExercise | undefined>(undefined)

// Calculate PRs from sets
const allPRs = computed(() => sortByLatestSet(calculatePRs(sets.value ?? [])))
const latestPRs = computed(() => allPRs.value.slice(0, 3))

// Weekly stats with comparison
const weeklyStats = computed(() => calculateWeeklyComparison(sets.value ?? []))
const formattedVolume = computed(() => formatVolume(weeklyStats.value.current.volume))

// Filter sets to last 30 days for home display
const recentSets = computed(() => filterLastNDays(sets.value ?? [], 30))

// Group sets by date (only last 30 days)
const setsByDate = computed(() => {
  const grouped: Record<string, SetWithExercise[]> = {}

  for (const set of recentSets.value) {
    const dateKey = set.date
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    grouped[dateKey].push(set)
  }

  return grouped
})

const sortedDates = computed(() => {
  return Object.keys(setsByDate.value).sort((a, b) => b.localeCompare(a))
})

// Check if there are more sets beyond last 30 days
const hasOlderSets = computed(() => (sets.value?.length ?? 0) > recentSets.value.length)

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Hoy'
  }
  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Ayer'
  }

  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

function openAddModal() {
  editingSet.value = undefined
  showModal.value = true
}

function openEditModal(set: SetWithExercise) {
  editingSet.value = set
  showModal.value = true
}

async function handleDelete(id: string, exerciseName: string) {
  const result = await remove(id)

  if (result.success) {
    track('set:delete_success', {
      source: 'dashboard',
      set_id: id,
      exercise_name: exerciseName
    })

    toast.add({
      title: 'Set eliminado',
      description: `${exerciseName} eliminado`,
      icon: 'i-lucide-trash-2',
      color: 'neutral'
    })
  } else {
    track('set:delete_error', {
      source: 'dashboard'
    })

    toast.add({
      title: 'Error',
      description: result.error,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function handleSetSaved() {
  await refetch()
}
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <article class="flex gap-2 sm:gap-3 items-center">
          <UAvatar
            v-if="userAvatar"
            :src="userAvatar"
            :alt="userName || userEmail || 'Usuario'"
            size="xl"
          />
          <div>
            <p class="mt-1 text-muted text-sm">
              Bienvenido de nuevo,
            </p>
            <h1 class="text-xl font-bold text-highlighted">
              {{ userName || userEmail }}
            </h1>
          </div>
        </article>
        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="hidden sm:flex shadow-lg shadow-primary-500/25 hover:shadow-primary-500/35"
          label="Nuevo Set"
          @click="openAddModal"
        />
        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="sm:hidden shadow-lg shadow-primary-500/25 hover:shadow-primary-500/35"
          square
          @click="openAddModal"
        />
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="card-elevated rounded-xl text-center py-8 px-6"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="h-8 w-8 mx-auto mb-2 text-red-400"
        />
        <p class="text-red-400">
          {{ error }}
        </p>
        <UButton
          variant="ghost"
          class="mt-4"
          @click="() => refetch()"
        >
          Reintentar
        </UButton>
      </div>

      <!-- Loading State -->
      <div
        v-else-if="loading && sets.length === 0"
        class="space-y-4"
      >
        <USkeleton class="h-6 w-32" />
        <div class="card-elevated rounded-xl p-5">
          <div class="space-y-3">
            <div
              v-for="i in 3"
              :key="i"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <USkeleton class="h-10 w-10 rounded-lg" />
                <div class="space-y-1">
                  <USkeleton class="h-4 w-24" />
                  <USkeleton class="h-3 w-16" />
                </div>
              </div>
              <USkeleton class="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="sets.length === 0"
        class="card-elevated rounded-xl text-center py-12 px-6"
      >
        <UIcon
          name="i-lucide-dumbbell"
          class="h-12 w-12 mx-auto text-dimmed"
        />
        <h3 class="mt-4 text-lg font-medium text-highlighted">
          No hay registros todavia
        </h3>
        <p class="mt-2 text-sm text-muted">
          Registra tu primer set para empezar a trackear tu progreso.
        </p>
        <UButton
          class="mt-4 w-max"
          icon="i-lucide-plus"
          @click="openAddModal"
        >
          Registrar Set
        </UButton>
      </div>

      <!-- Content when there are sets -->
      <template v-else>
        <!-- PRs Section -->
        <div v-if="allPRs.length > 0">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              Últimos Records
            </h2>
            <NuxtLink
              to="/records"
              class="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Ver todo
              <UIcon
                name="i-lucide-arrow-right"
                class="h-4 w-4"
              />
            </NuxtLink>
          </div>

          <!-- Mobile: horizontal row with latest PRs -->
          <div class="lg:hidden -mx-4 px-4">
            <div class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pr-8 pb-1">
              <NuxtLink
                v-for="pr in latestPRs"
                :key="`mobile-${pr.exercise.id}`"
                :to="`/exercise/${pr.exercise.slug}`"
                class="group w-[84%] max-w-xs shrink-0 snap-start"
              >
                <div class="card-elevated relative overflow-hidden rounded-xl p-4 transition-all">
                  <div class="absolute top-2 right-2 opacity-10">
                    <UIcon
                      name="i-lucide-dumbbell"
                      class="h-12 w-12 text-primary-400"
                    />
                  </div>
                  <div class="relative">
                    <p class="text-xs font-medium uppercase tracking-wider text-muted truncate">
                      {{ pr.exercise.name }}
                    </p>
                    <div class="mt-2 flex items-baseline gap-2">
                      <span class="font-display text-5xl tracking-tight text-primary-400 text-glow">{{ pr.current1RM }}</span>
                      <span class="text-lg text-muted">kg</span>
                    </div>
                    <p class="mt-2 text-sm text-dimmed">
                      {{ pr.latestSet.weight_kg }}kg x {{ pr.latestSet.reps }} reps
                    </p>
                    <UBadge
                      :color="pr.allTimeBest1RM ? 'secondary' : 'primary'"
                      variant="subtle"
                      size="xs"
                      class="mt-2"
                      :icon="'i-lucide-trophy'"
                    >
                      {{ pr.allTimeBest1RM ? `Mejor: ${pr.allTimeBest1RM}kg` : 'Record Personal' }}
                    </UBadge>
                  </div>
                  <div class="absolute bottom-4 right-4">
                    <UIcon
                      name="i-lucide-chevron-right"
                      class="h-5 w-5 text-dimmed transition-transform group-hover:translate-x-1 group-hover:text-primary-400"
                    />
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>

          <!-- Desktop: latest records grid -->
          <div class="hidden gap-3 lg:grid grid-cols-3">
            <NuxtLink
              v-for="pr in latestPRs"
              :key="pr.exercise.id"
              :to="`/exercise/${pr.exercise.slug}`"
              class="group"
            >
              <div class="card-elevated relative overflow-hidden rounded-xl p-5 transition-all">
                <!-- Background decoration -->
                <div class="absolute top-2 right-2 opacity-10">
                  <UIcon
                    name="i-lucide-dumbbell"
                    class="h-14 w-14 text-primary-400"
                  />
                </div>
                <!-- Content -->
                <div class="relative">
                  <p class="text-xs font-medium uppercase tracking-wider text-muted">
                    {{ pr.exercise.name }}
                  </p>
                  <div class="mt-2 flex items-baseline gap-2">
                    <span class="font-display text-5xl tracking-tight text-primary-400 text-glow">{{ pr.current1RM }}</span>
                    <span class="text-lg text-muted">kg</span>
                  </div>
                  <p class="mt-2 text-sm text-dimmed">
                    {{ pr.latestSet.weight_kg }}kg x {{ pr.latestSet.reps }} reps
                  </p>
                  <!-- Status badge -->
                  <UBadge
                    :color="pr.allTimeBest1RM ? 'secondary' : 'primary'"
                    variant="subtle"
                    size="sm"
                    class="mt-2"
                    :icon="'i-lucide-trophy'"
                  >
                    {{ pr.allTimeBest1RM ? `Mejor: ${pr.allTimeBest1RM}kg` : 'Record Personal' }}
                  </UBadge>
                </div>
                <!-- Chevron -->
                <div class="absolute bottom-5 right-5">
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="h-5 w-5 text-dimmed transition-transform group-hover:translate-x-1 group-hover:text-primary-400"
                  />
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>

        <!-- Weekly Stats Section -->
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-muted mb-4">
            Esta Semana
          </h2>
          <div class="grid gap-1 sm:gap-3 grid-cols-2 sm:grid-cols-3">
            <!-- Sets -->
            <div class="card-elevated rounded-xl p-5">
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-lucide-layers"
                  class="h-4 w-4 text-secondary-400"
                />
                <p class="text-xs font-medium uppercase tracking-wider text-muted">
                  Sets
                </p>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="font-display text-4xl text-primary-400 text-glow">{{ weeklyStats.current.sets }}</span>
                <span
                  v-if="weeklyStats.setsDiff !== 0"
                  class="text-sm font-medium"
                  :class="weeklyStats.setsDiff > 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ weeklyStats.setsDiff > 0 ? '+' : '' }}{{ weeklyStats.setsDiff }}
                </span>
                <span
                  v-else-if="weeklyStats.previous.sets > 0"
                  class="text-sm text-dimmed"
                >=</span>
              </div>
              <p class="mt-1 text-xs text-dimmed">
                vs {{ weeklyStats.previous.sets }} semana pasada
              </p>
            </div>

            <!-- Training Days -->
            <div class="card-elevated rounded-xl p-5">
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-lucide-calendar-days"
                  class="h-4 w-4 text-secondary-400"
                />
                <p class="text-xs font-medium uppercase tracking-wider text-muted">
                  Dias
                </p>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="font-display text-4xl text-primary-400 text-glow">{{ weeklyStats.current.days }}</span>
                <span class="text-lg text-muted">/7</span>
                <span
                  v-if="weeklyStats.daysDiff !== 0"
                  class="text-sm font-medium"
                  :class="weeklyStats.daysDiff > 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ weeklyStats.daysDiff > 0 ? '+' : '' }}{{ weeklyStats.daysDiff }}
                </span>
              </div>
              <p class="mt-1 text-xs text-dimmed">
                vs {{ weeklyStats.previous.days }} semana pasada
              </p>
            </div>

            <!-- Volume -->
            <div class="card-elevated rounded-xl p-5 col-span-2 sm:col-span-1">
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-lucide-weight"
                  class="h-4 w-4 text-secondary-400"
                />
                <p class="text-xs font-medium uppercase tracking-wider text-muted">
                  Volumen
                </p>
              </div>
              <div class="flex items-baseline gap-2">
                <span class="font-display text-4xl text-primary-400 text-glow">{{ formattedVolume.value }}</span>
                <span class="text-lg text-muted">{{ formattedVolume.unit }}</span>
                <span
                  v-if="weeklyStats.volumePercentChange !== null && weeklyStats.volumePercentChange !== 0"
                  class="text-sm font-medium"
                  :class="weeklyStats.volumePercentChange > 0 ? 'text-emerald-400' : 'text-red-400'"
                >
                  {{ weeklyStats.volumePercentChange > 0 ? '+' : '' }}{{ weeklyStats.volumePercentChange }}%
                </span>
              </div>
              <p class="mt-1 text-xs text-dimmed">
                {{ formatVolume(weeklyStats.previous.volume).value }}{{ formatVolume(weeklyStats.previous.volume).unit }} semana pasada
              </p>
            </div>
          </div>
        </div>

        <!-- History Section -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              Historial
            </h2>
            <NuxtLink
              to="/history"
              class="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Ver todo
              <UIcon
                name="i-lucide-arrow-right"
                class="h-4 w-4"
              />
            </NuxtLink>
          </div>

          <!-- Empty recent history -->
          <div
            v-if="recentSets.length === 0"
            class="card-elevated rounded-xl p-8 text-center"
          >
            <UIcon
              name="i-lucide-calendar-x"
              class="h-10 w-10 mx-auto text-dimmed"
            />
            <p class="mt-3 text-sm text-muted">
              No hay sets en los ultimos 30 dias
            </p>
          </div>

          <div
            v-for="dateKey in sortedDates"
            :key="dateKey"
          >
            <h3 class="text-sm font-medium text-dimmed mb-3 capitalize">
              {{ formatDate(dateKey) }}
            </h3>
            <div class="card-elevated rounded-xl p-4">
              <div class="divide-y divide-zinc-800">
                <div
                  v-for="set in setsByDate[dateKey]"
                  :key="set.id"
                  class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-zinc-800 rounded-lg">
                      <UIcon
                        name="i-lucide-dumbbell"
                        class="h-5 w-5 text-primary-400"
                      />
                    </div>
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ set.exercise.name }}
                      </p>
                      <p class="text-sm text-muted">
                        {{ set.weight_kg }}kg x {{ set.reps }} reps
                        <span class="text-primary-400">
                          · {{ calculate1RM(set.weight_kg, set.reps) }}kg e1RM
                        </span>
                      </p>
                    </div>
                  </div>
                  <UDropdownMenu
                    :items="[
                      [{
                        label: 'Editar',
                        icon: 'i-lucide-pencil',
                        onSelect: () => openEditModal(set)
                      }],
                      [{
                        label: 'Eliminar',
                        icon: 'i-lucide-trash-2',
                        color: 'error' as const,
                        onSelect: () => handleDelete(set.id, set.exercise.name)
                      }]
                    ]"
                  >
                    <UButton
                      icon="i-lucide-more-vertical"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                    />
                  </UDropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <!-- Show link to older sets if they exist -->
          <div
            v-if="hasOlderSets"
            class="text-center"
          >
            <NuxtLink
              to="/history"
              class="inline-flex items-center gap-2 text-sm text-muted hover:text-primary-400 transition-colors"
            >
              <UIcon
                name="i-lucide-history"
                class="h-4 w-4"
              />
              Ver historial completo ({{ sets.length - recentSets.length }} sets anteriores)
            </NuxtLink>
          </div>
        </div>
      </template>
    </div>

    <!-- Set Modal (Add/Edit) -->
    <SetModal
      v-model:open="showModal"
      :edit-set="editingSet"
      @saved="handleSetSaved"
    />
  </UContainer>
</template>

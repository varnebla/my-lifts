<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import type { SetWithExercise } from '~/types/database'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const exerciseSlug = route.params.slug as string

const { calculate: calculate1RM } = use1RM()
const toast = useToast()

// Fetch exercise and sets with SSR
const { data: exercise, status: exerciseStatus } = await useExerciseBySlug(exerciseSlug)
const { data: exerciseSets, status: setsStatus, refetch } = await useExerciseSetsBySlug(exerciseSlug)

const loading = computed(() => exerciseStatus.value === 'pending' || setsStatus.value === 'pending')
const showModal = ref(false)
const editingSet = ref<SetWithExercise | undefined>(undefined)

const exerciseNameForMeta = computed(() => {
  if (exercise.value?.name) return exercise.value.name
  return exerciseSlug.replace(/-/g, ' ')
})

const exerciseMetaTitle = computed(() => `${exerciseNameForMeta.value} | My Lifts`)
const exerciseMetaDescription = computed(() => `Sigue el progreso, historial y porcentajes de ${exerciseNameForMeta.value} en My Lifts.`)

useSeoMeta({
  title: exerciseMetaTitle,
  description: exerciseMetaDescription,
  ogTitle: exerciseMetaTitle,
  ogDescription: exerciseMetaDescription
})

// Mutations for delete
const { remove } = useSetMutations(exerciseSets)

// Calculate 1RM for each set and get best per date
const chartData = computed(() => {
  const sets = exerciseSets.value ?? []
  if (sets.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  // Group by date and get best 1RM per date
  const bestByDate = new Map<string, number>()

  for (const set of sets) {
    const e1rm = calculate1RM(set.weight_kg, set.reps)
    const current = bestByDate.get(set.date) ?? 0
    if (e1rm > current) {
      bestByDate.set(set.date, e1rm)
    }
  }

  // Sort by date
  const sortedEntries = [...bestByDate.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  return {
    labels: sortedEntries.map(([date]) => formatDateShort(date)),
    datasets: [
      {
        label: 'e1RM (kg)',
        data: sortedEntries.map(([, value]) => value),
        borderColor: '#BEFF00',
        backgroundColor: 'rgba(190, 255, 0, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#BEFF00',
        pointBorderColor: '#BEFF00',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.9)',
      titleColor: '#fff',
      bodyColor: '#BEFF00',
      borderColor: 'rgba(190, 255, 0, 0.3)',
      borderWidth: 1,
      callbacks: {
        label: (context: { parsed: { y: number | null } }) => `${context.parsed.y ?? 0} kg`
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)'
      }
    },
    y: {
      beginAtZero: false,
      grid: {
        color: 'rgba(255, 255, 255, 0.05)'
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.5)'
      }
    }
  }
}

// Current (latest) 1RM and all-time best
const currentPR = computed(() => {
  const sets = exerciseSets.value ?? []
  if (sets.length === 0) return null

  // Sort by date desc, then created_at desc to get the latest
  const sorted = [...sets].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })

  const latestSet = sorted[0]!
  const current1RM = calculate1RM(latestSet.weight_kg, latestSet.reps)

  // Find all-time best
  let allTimeBest1RM = current1RM
  let allTimeBestSet = latestSet

  for (const set of sets) {
    const e1rm = calculate1RM(set.weight_kg, set.reps)
    if (e1rm > allTimeBest1RM) {
      allTimeBest1RM = e1rm
      allTimeBestSet = set
    }
  }

  return {
    value: current1RM,
    set: latestSet,
    allTimeBest: allTimeBest1RM > current1RM ? allTimeBest1RM : null,
    allTimeBestSet: allTimeBest1RM > current1RM ? allTimeBestSet : null
  }
})

// Percentage table
const percentages = [100, 95, 90, 85, 80, 75, 70, 60, 50]
const selectedPercentage = ref(100)

const percentageTable = computed(() => {
  if (!currentPR.value) return []

  return percentages.map(pct => ({
    percentage: pct,
    weight: Math.round(currentPR.value!.value * pct / 100 * 10) / 10
  }))
})

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(1)
}

function selectPercentage(percentage: number) {
  selectedPercentage.value = percentage
}

// Format date for chart labels
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

// Format date for history
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Recent history (last 10 sets, ordered by most recent first)
const recentHistory = computed(() => {
  return [...(exerciseSets.value ?? [])]
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return b.created_at.localeCompare(a.created_at)
    })
    .slice(0, 10)
})

// Open edit modal
function openEditModal(set: SetWithExercise) {
  editingSet.value = set
  showModal.value = true
}

// Handle delete
async function handleDelete(id: string) {
  const result = await remove(id)

  if (result.success) {
    toast.add({
      title: 'Set eliminado',
      icon: 'i-lucide-trash-2',
      color: 'neutral'
    })
  } else {
    toast.add({
      title: 'Error',
      description: result.error,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

// Refresh data after adding/editing a set
function handleSetSaved() {
  editingSet.value = undefined
  refetch()
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Back button -->
    <div class="mb-6">
      <UButton
        to="/dashboard"
        variant="ghost"
        icon="i-lucide-arrow-left"
        color="neutral"
      >
        Atrás
      </UButton>
    </div>

    <!-- Not found -->
    <div
      v-if="!loading && !exercise"
      class="card-elevated rounded-xl text-center py-12 px-6"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="h-12 w-12 mx-auto text-dimmed"
      />
      <h2 class="mt-4 text-lg font-medium text-highlighted">
        Ejercicio no encontrado
      </h2>
      <UButton
        to="/dashboard"
        class="mt-4"
      >
        Volver al Dashboard
      </UButton>
    </div>

    <!-- Content -->
    <div
      v-else
      class="space-y-6"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="p-2 md:p-3 bg-accented rounded-xl flex items-center">
            <UIcon
              name="i-lucide-dumbbell"
              class="size-5 text-primary-400"
            />
          </div>
          <USkeleton
            v-if="loading"
            class="h-9 w-48"
          />
          <h1
            v-else
            class="text-2xl md:text-3xl font-bold text-highlighted"
          >
            {{ exercise?.name }}
          </h1>
        </div>
        <!-- Button in header -->
        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="hidden sm:flex"
          label="Nuevo Set"
          :disabled="loading"
          @click="editingSet = undefined; showModal = true"
        />
        <UButton
          icon="i-lucide-plus"
          size="lg"
          class="sm:hidden"
          square
          :disabled="loading"
          @click="editingSet = undefined; showModal = true"
        />
        <!-- <UButton
          icon="i-lucide-plus"
          :disabled="loading"
          @click="editingSet = undefined; showModal = true"
        >
          Registrar Set
        </UButton> -->
      </div>

      <!-- PR Hero Card + Chart Row -->
      <div class="grid gap-6 lg:grid-cols-7">
        <!-- PR Hero Card -->
        <div class="card-pr lg:col-span-2 min-w-0 relative overflow-hidden rounded-xl p-6">
          <div class="absolute top-2 right-2 opacity-15">
            <UIcon
              name="i-lucide-dumbbell"
              class="h-16 w-16 text-primary-400"
            />
          </div>
          <div
            v-if="loading"
            class="space-y-3"
          >
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-14 w-32" />
            <USkeleton class="h-4 w-28" />
            <USkeleton class="h-5 w-24" />
          </div>
          <div
            v-else-if="currentPR"
            class="relative"
          >
            <p class="text-xs font-medium uppercase tracking-wider text-muted">
              Current 1RM
            </p>
            <div class="mt-2 flex items-baseline gap-2">
              <span class="font-display text-6xl tracking-tight text-primary-400 text-glow">{{ currentPR.value }}</span>
              <span class="text-xl text-muted">kg</span>
            </div>
            <p class="mt-3 text-sm text-dimmed">
              {{ currentPR.set?.weight_kg }}kg x {{ currentPR.set?.reps }} reps
            </p>
            <UBadge
              :color="currentPR.allTimeBest ? 'secondary' : 'primary'"
              variant="subtle"
              size="sm"
              class="mt-3"
              :icon="'i-lucide-trophy'"
            >
              {{ currentPR.allTimeBest ? `Best: ${currentPR.allTimeBest}kg` : 'Personal Best' }}
            </UBadge>
          </div>
          <div
            v-else
            class="text-center py-4"
          >
            <p class="text-sm text-dimmed">
              Sin datos
            </p>
          </div>
        </div>

        <!-- Progress Chart -->
        <div class="card-elevated lg:col-span-5 min-w-0 overflow-hidden rounded-xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="h-2 w-2 rounded-full bg-primary-400" />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              1RM Progression
            </h2>
          </div>
          <div class="h-48 lg:h-44">
            <USkeleton
              v-if="loading"
              class="h-full w-full"
            />
            <Line
              v-else-if="chartData.labels.length > 0"
              :data="chartData"
              :options="chartOptions"
            />
            <div
              v-else
              class="h-full flex items-center justify-center"
            >
              <p class="text-sm text-dimmed">
                Sin datos para mostrar
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- No data state (only when not loading and no sets) -->
      <div
        v-if="!loading && exerciseSets.length === 0"
        class="card-elevated rounded-xl text-center py-12 px-6"
      >
        <UIcon
          name="i-lucide-bar-chart-3"
          class="h-12 w-12 mx-auto text-dimmed"
        />
        <h3 class="mt-4 text-lg font-medium text-highlighted">
          No hay datos todavia
        </h3>
        <p class="mt-2 text-sm text-muted">
          Registra sets de {{ exercise?.name }} para ver tu progreso.
        </p>
        <UButton
          class="mt-4"
          @click="editingSet = undefined; showModal = true"
        >
          Registrar Set
        </UButton>
      </div>

      <!-- Percentage Table & History -->
      <div
        v-if="loading || exerciseSets.length > 0"
        class="grid gap-6 lg:grid-cols-2"
      >
        <!-- Percentage Table -->
        <div class="card-elevated rounded-xl p-5 lg:flex lg:max-h-128 lg:flex-col lg:overflow-hidden">
          <div class="flex items-center gap-2 mb-4">
            <UIcon
              name="i-lucide-percent"
              class="h-5 w-5 text-secondary-400"
            />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              Percentage Table
            </h2>
          </div>
          <div v-if="loading">
            <USkeleton class="h-4 w-40 mb-4" />
            <div class="grid grid-cols-2 gap-2">
              <USkeleton
                v-for="i in 10"
                :key="i"
                class="h-10"
              />
            </div>
          </div>
          <template v-else>
            <p class="text-sm text-dimmed mb-4">
              Based on your 1RM of <span class="text-primary-400 font-display text-lg">{{ currentPR?.value }}</span> kg
            </p>

            <div class="space-y-2">
              <button
                v-for="row in percentageTable"
                :key="`list-${row.percentage}`"
                type="button"
                class="w-full flex items-center justify-between rounded-lg border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                :class="selectedPercentage === row.percentage
                  ? 'border-primary-500/50 bg-primary-500/15'
                  : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700'"
                @click="selectPercentage(row.percentage)"
              >
                <span
                  class="  leading-none"
                  :class="selectedPercentage === row.percentage ? 'text-primary-300' : 'text-muted'"
                >
                  {{ row.percentage }}%
                </span>
                <span
                  class="font-display text-2xl leading-none"
                  :class="selectedPercentage === row.percentage ? 'text-primary-300' : 'text-highlighted'"
                >
                  {{ formatWeight(row.weight) }}
                  <span class="text-sm font-medium text-muted">kg</span>
                </span>
              </button>
            </div>
          </template>
        </div>

        <!-- Recent History -->
        <div class="card-elevated rounded-xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <UIcon
              name="i-lucide-history"
              class="h-5 w-5 text-secondary-400"
            />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
              History Log
            </h2>
          </div>
          <div
            v-if="loading"
            class="space-y-3"
          >
            <div
              v-for="i in 5"
              :key="i"
              class="flex items-center justify-between"
            >
              <div class="space-y-1">
                <USkeleton class="h-5 w-32" />
                <USkeleton class="h-3 w-24" />
              </div>
              <USkeleton class="h-8 w-8 rounded" />
            </div>
          </div>
          <div
            v-else
            class="divide-y divide-zinc-800 lg:overflow-y-auto lg:pr-1"
          >
            <div
              v-for="set in recentHistory"
              :key="set.id"
              class="py-3 first:pt-0 last:pb-0 flex items-center justify-between"
            >
              <div>
                <p class="font-medium text-highlighted">
                  {{ set.weight_kg }}kg x {{ set.reps }}
                  <span class="text-primary-400 text-sm">
                    · {{ calculate1RM(set.weight_kg, set.reps) }}kg e1RM
                  </span>
                </p>
                <p class="text-xs text-dimmed">
                  {{ formatDate(set.date) }}
                </p>
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
                    onSelect: () => handleDelete(set.id)
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
    </div>

    <!-- Set Modal -->
    <SetModal
      v-model:open="showModal"
      :default-exercise-id="exercise?.id"
      :edit-set="editingSet"
      @saved="handleSetSaved"
    />
  </UContainer>
</template>

<script setup lang="ts">
import type { SetWithExercise } from '~/types/database'

definePageMeta({
  middleware: 'auth'
})

const { calculate: calculate1RM } = use1RM()
const toast = useToast()

// Fetch exercises and sets with SSR caching
const { data: exercises } = await useExercisesData()
const { data: sets, status, refetch } = await useSetsData()

const loading = computed(() => status.value === 'pending')
const { remove } = useSetMutations(sets)

// Modal state
const showModal = ref(false)
const editingSet = ref<SetWithExercise | undefined>(undefined)

// Filter state
const selectedExerciseId = ref<string | null>(null)

// Exercise options for filter
const exerciseOptions = computed(() => {
  return [
    { label: 'Todos los ejercicios', value: null },
    ...exercises.value.map(e => ({ label: e.name, value: e.id }))
  ]
})

// Filtered sets
const filteredSets = computed(() => {
  if (!selectedExerciseId.value) return sets.value
  return sets.value.filter(s => s.exercise_id === selectedExerciseId.value)
})

// Group sets by date
const setsByDate = computed(() => {
  const grouped: Record<string, SetWithExercise[]> = {}

  for (const set of filteredSets.value) {
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

// Stats
const totalSets = computed(() => filteredSets.value.length)
const totalVolume = computed(() => {
  return filteredSets.value.reduce((sum, s) => sum + s.weight_kg * s.reps, 0)
})
const uniqueDays = computed(() => {
  return new Set(filteredSets.value.map(s => s.date)).size
})

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
    month: 'long',
    year: 'numeric'
  })
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return volume.toString()
}

function openEditModal(set: SetWithExercise) {
  editingSet.value = set
  showModal.value = true
}

async function handleDelete(id: string, exerciseName: string) {
  const result = await remove(id)

  if (result.success) {
    toast.add({
      title: 'Set eliminado',
      description: `${exerciseName} eliminado`,
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
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <UButton
            to="/dashboard"
            variant="ghost"
            icon="i-lucide-arrow-left"
            color="neutral"
          />
          <div>
            <h1 class="text-3xl font-bold text-highlighted">
              Historial
            </h1>
            <p class="mt-1 text-muted">
              Todos tus sets registrados
            </p>
          </div>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="card-elevated rounded-xl p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">
            Total Sets
          </p>
          <p class="mt-1 font-display text-3xl text-primary-400">
            {{ totalSets }}
          </p>
        </div>
        <div class="card-elevated rounded-xl p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">
            Dias Entrenados
          </p>
          <p class="mt-1 font-display text-3xl text-primary-400">
            {{ uniqueDays }}
          </p>
        </div>
        <div class="card-elevated rounded-xl p-4">
          <p class="text-xs font-medium uppercase tracking-wider text-muted">
            Volumen Total
          </p>
          <p class="mt-1 font-display text-3xl text-primary-400">
            {{ formatVolume(totalVolume) }}
            <span class="text-lg text-muted">kg</span>
          </p>
        </div>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-4">
        <UIcon
          name="i-lucide-filter"
          class="h-5 w-5 text-muted"
        />
        <USelectMenu
          v-model="selectedExerciseId"
          :items="exerciseOptions"
          value-key="value"
          class="w-64"
          placeholder="Filtrar por ejercicio"
        />
      </div>

      <!-- Loading State -->
      <div
        v-if="loading && sets.length === 0"
        class="space-y-4"
      >
        <div
          v-for="i in 3"
          :key="i"
        >
          <USkeleton class="h-5 w-32 mb-3" />
          <div class="card-elevated rounded-xl p-5">
            <div class="space-y-3">
              <div
                v-for="j in 2"
                :key="j"
                class="flex items-center gap-3"
              >
                <USkeleton class="h-10 w-10 rounded-lg" />
                <div class="space-y-1">
                  <USkeleton class="h-4 w-24" />
                  <USkeleton class="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredSets.length === 0"
        class="card-elevated rounded-xl text-center py-12 px-6"
      >
        <UIcon
          name="i-lucide-search-x"
          class="h-12 w-12 mx-auto text-dimmed"
        />
        <h3 class="mt-4 text-lg font-medium text-highlighted">
          No hay sets
        </h3>
        <p class="mt-2 text-sm text-muted">
          {{ selectedExerciseId ? 'No hay sets para este ejercicio' : 'Todavia no has registrado ningun set' }}
        </p>
        <UButton
          v-if="selectedExerciseId"
          variant="ghost"
          class="mt-4"
          @click="selectedExerciseId = null"
        >
          Limpiar filtro
        </UButton>
      </div>

      <!-- History List -->
      <div
        v-else
        class="space-y-6"
      >
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
      </div>
    </div>

    <!-- Set Modal (Edit only from history) -->
    <SetModal
      v-model:open="showModal"
      :edit-set="editingSet"
      @saved="() => refetch()"
    />
  </UContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  middleware: 'auth'
})

useSeoMeta({
  title: 'Records | My Lifts',
  description: 'Revisa tus personal records por ejercicio y detecta mejoras recientes de rendimiento en My Lifts.',
  ogTitle: 'Records | My Lifts',
  ogDescription: 'Revisa tus personal records por ejercicio y detecta mejoras recientes de rendimiento en My Lifts.'
})

const { calculatePRs, sortByLatestSet } = usePRs()
const { data: sets, status } = await useSetsData()

const loading = computed(() => status.value === 'pending')
const allPRs = computed(() => sortByLatestSet(calculatePRs(sets.value ?? [])))
</script>

<template>
  <UContainer class="py-8">
    <div class="space-y-8">
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
              Personal Records
            </h1>
            <p class="mt-1 text-muted">
              Todos tus records ordenados por actividad reciente
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="loading && allPRs.length === 0"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="card-elevated rounded-xl p-5"
        >
          <USkeleton class="h-4 w-24" />
          <USkeleton class="mt-3 h-12 w-28" />
          <USkeleton class="mt-3 h-4 w-20" />
        </div>
      </div>

      <div
        v-else-if="allPRs.length === 0"
        class="card-elevated rounded-xl text-center py-12 px-6"
      >
        <UIcon
          name="i-lucide-trophy"
          class="h-12 w-12 mx-auto text-dimmed"
        />
        <h3 class="mt-4 text-lg font-medium text-highlighted">
          Aún no hay records
        </h3>
        <p class="mt-2 text-sm text-muted">
          Registra sets para empezar a construir tus personal records.
        </p>
        <UButton
          to="/dashboard"
          class="mt-4"
          icon="i-lucide-plus"
        >
          Registrar Set
        </UButton>
      </div>

      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <NuxtLink
          v-for="pr in allPRs"
          :key="pr.exercise.id"
          :to="`/exercise/${pr.exercise.slug}`"
          class="group"
        >
          <div class="card-elevated relative overflow-hidden rounded-xl p-5 transition-all">
            <div class="absolute top-2 right-2 opacity-10">
              <UIcon
                name="i-lucide-dumbbell"
                class="h-14 w-14 text-primary-400"
              />
            </div>
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
              <UBadge
                :color="pr.allTimeBest1RM ? 'secondary' : 'primary'"
                variant="subtle"
                size="xs"
                class="mt-2"
                :icon="'i-lucide-trophy'"
              >
                {{ pr.allTimeBest1RM ? `Best: ${pr.allTimeBest1RM}kg` : 'Personal Best' }}
              </UBadge>
            </div>
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
  </UContainer>
</template>

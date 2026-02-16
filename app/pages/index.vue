<script setup lang="ts">
const { isAuthenticated } = useAuth()
const { open } = useLoginModal()
const route = useRoute()

useSeoMeta({
  title: 'My Lifts | Trackea tus levantamientos y mejora tu 1RM',
  description: 'Registra cada set, revisa tu progreso semanal y detecta tus personal records en segundos con My Lifts.',
  ogTitle: 'My Lifts | Trackea tus levantamientos y mejora tu 1RM',
  ogDescription: 'Registra cada set, revisa tu progreso semanal y detecta tus personal records en segundos con My Lifts.'
})

if (isAuthenticated.value) {
  await navigateTo('/dashboard', { replace: true })
}

onMounted(() => {
  if (route.query.login === '1') {
    setTimeout(() => {
      open()
    }, 50)
  }
})
</script>

<template>
  <UContainer class="py-12 lg:py-16">
    <div class="mx-auto max-w-5xl space-y-10">
      <div class="text-center space-y-4">
        <UBadge
          color="primary"
          variant="subtle"
          size="lg"
          class="mx-auto"
          icon="i-lucide-dumbbell"
        >
          My Lifts
        </UBadge>

        <h1 class="text-4xl md:text-5xl font-bold text-balance text-highlighted leading-tight">
          Trackea tus levantamientos
          <span class="text-primary">y mejora tu 1RM</span>
        </h1>

        <p class="mx-auto max-w-2xl text-balance md:text-lg text-muted">
          Registra cada set, revisa tu progreso semanal y detecta tus personal records en segundos.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <UButton
            size="xl"
            @click="open"
          >
            Registrar mi primer set
          </UButton>
        </div>
      </div>

      <div class="mx-auto w-full max-w-6xl rounded-2xl border border-default bg-elevated/40 p-3 md:p-4">
        <div class="overflow-hidden rounded-xl border border-default bg-default">
          <picture>
            <source
              srcset="/app-screenshot.webp"
              type="image/png"
            >
            <img
              src="/app-screenshot.webp"
              alt="Vista real de la aplicación My Lifts"
              class="w-full h-auto object-contain"
              loading="eager"
            >
          </picture>
        </div>
      </div>

      <div class="text-center space-y-3 pt-16">
        <h2 class="text-2xl md:text-3xl font-bold text-highlighted text-balance">
          Todo lo que necesitas para progresar
        </h2>
        <p class="mx-auto max-w-2xl text-muted md:text-lg text-balance">
          Registra, analiza y mejora tus levantamientos con métricas claras en una sola app.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="card-elevated rounded-xl p-5 space-y-2">
          <div class="flex items-center gap-2 text-primary">
            <UIcon
              name="i-lucide-trophy"
              class="h-5 w-5"
            />
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">
              Personal Records
            </p>
          </div>
          <p class="text-sm text-muted">
            Calcula tu e1RM automáticamente y detecta mejoras por ejercicio.
          </p>
        </div>

        <div class="card-elevated rounded-xl p-5 space-y-2">
          <div class="flex items-center gap-2 text-primary">
            <UIcon
              name="i-lucide-calendar-days"
              class="h-5 w-5"
            />
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">
              Historial claro
            </p>
          </div>
          <p class="text-sm text-muted">
            Consulta tus sets por fecha y ejercicio para planear mejor cada semana.
          </p>
        </div>

        <div class="card-elevated rounded-xl p-5 space-y-2">
          <div class="flex items-center gap-2 text-primary">
            <UIcon
              name="i-lucide-bar-chart-3"
              class="h-5 w-5"
            />
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">
              Progreso visual
            </p>
          </div>
          <p class="text-sm text-muted">
            Entiende tendencias de rendimiento y volumen de entrenamiento rápidamente.
          </p>
        </div>
      </div>
    </div>
  </UContainer>
</template>

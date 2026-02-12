<script setup lang="ts">
const { isAuthenticated, userEmail, userAvatar, userName, logout, loading } = useAuth()
const loginModal = useLoginModal()
const homeLink = computed(() => (isAuthenticated.value ? '/dashboard' : '/'))

// Auth is initialized by the server plugin during SSR
// and by the middleware on client-side navigation

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'My Lifts'
const description = 'Trackea tus levantamientos y visualiza tu progreso de 1RM.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

async function handleLogout(e: Event) {
  e.preventDefault()
  const result = await logout()
  if (!result.success) {
    console.error('Logout failed:', result.error)
  }
}
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          :to="homeLink"
          class="flex items-center gap-2"
        >
          <span class="text-xl font-bold text-primary">My Lifts</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />

        <template v-if="isAuthenticated">
          <UDropdownMenu
            :items="[
              [{
                label: userName || userEmail || 'Usuario',
                disabled: true
              }],
              [{
                label: 'Cerrar Sesión',
                icon: 'i-lucide-log-out',
                onSelect: handleLogout
              }]
            ]"
          >
            <UAvatar
              v-if="userAvatar"
              :src="userAvatar"
              :alt="userName || userEmail || 'Usuario'"
              size="sm"
              class="cursor-pointer"
            />
            <UButton
              v-else
              icon="i-lucide-user"
              color="neutral"
              variant="ghost"
              :loading="loading"
            />
          </UDropdownMenu>
        </template>

        <template v-else>
          <UButton
            icon="i-simple-icons-google"
            @click="loginModal.open"
          >
            Iniciar Sesión
          </UButton>
        </template>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          My Lifts {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>

    <!-- Login Modal -->
    <LoginModal v-model:open="loginModal.isOpen.value" />
  </UApp>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { loginWithGoogle, loading } = useAuth()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

// Login just redirects to the server endpoint
async function handleGoogleLogin() {
  await loginWithGoogle()
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <div class="text-center space-y-6 p-4">
          <!-- Logo & Title -->
          <div>
            <div class="mx-auto h-12 w-12 text-primary">
              <UIcon
                name="i-lucide-dumbbell"
                class="h-12 w-12"
              />
            </div>
            <h1 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              My Lifts
            </h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Trackea tus levantamientos y visualiza tu progreso
            </p>
          </div>

          <!-- Google Login Button -->
          <UButton
            block
            size="xl"
            color="neutral"
            variant="outline"
            icon="i-simple-icons-google"
            :loading="loading"
            @click="handleGoogleLogin"
          >
            Continuar con Google
          </UButton>

          <!-- Footer -->
          <p class="text-xs text-gray-500 dark:text-gray-500">
            Al continuar, aceptas nuestros términos de servicio
          </p>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

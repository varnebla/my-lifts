<script setup lang="ts">
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import type { Exercise, SetWithExercise } from '~/types/database'

const props = defineProps<{
  open: boolean
  editSet?: SetWithExercise
  defaultExerciseId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

// Responsive: Modal on desktop, Drawer on mobile
const [DefineFormTemplate, ReuseFormTemplate] = createReusableTemplate()
const isDesktop = useMediaQuery('(min-width: 768px)')

const { exercises, fetch: fetchExercises } = useExercises()
const { create, update } = useSetActions()
const { track } = useAnalytics()
const toast = useToast()
const route = useRoute()

// Form state
const selectedExercise = ref<Exercise | undefined>(undefined)
const weightKg = ref<number | null>(null)
const reps = ref<number | null>(null)
const date = ref(new Date().toISOString().split('T')[0])
const notes = ref('')
const saving = ref(false)

const isEditing = computed(() => !!props.editSet)
const title = computed(() => isEditing.value ? 'Editar Set' : 'Registrar Set')

// Fetch exercises and populate form when opened
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await fetchExercises()

    if (props.editSet) {
      selectedExercise.value = exercises.value.find(e => e.id === props.editSet!.exercise_id)
      weightKg.value = props.editSet.weight_kg
      reps.value = props.editSet.reps
      date.value = props.editSet.date
      notes.value = props.editSet.notes || ''
    } else {
      resetForm()
      // Pre-select exercise if defaultExerciseId is provided
      if (props.defaultExerciseId) {
        selectedExercise.value = exercises.value.find(e => e.id === props.defaultExerciseId)
      }
    }
  }
})

function resetForm() {
  selectedExercise.value = undefined
  weightKg.value = null
  reps.value = null
  date.value = new Date().toISOString().split('T')[0]
  notes.value = ''
}

const isValid = computed(() => {
  return selectedExercise.value && weightKg.value && weightKg.value > 0 && reps.value && reps.value > 0
})

function getSourcePage() {
  if (route.path.startsWith('/exercise/')) return 'exercise_detail'
  if (route.path.startsWith('/history')) return 'history'
  return 'dashboard'
}

async function handleSubmit() {
  if (!isValid.value || !selectedExercise.value || !weightKg.value || !reps.value) return

  saving.value = true

  const setData = {
    exercise_id: selectedExercise.value.id,
    weight_kg: weightKg.value,
    reps: reps.value,
    date: date.value,
    notes: notes.value || null
  }

  const result = isEditing.value && props.editSet
    ? await update(props.editSet.id, setData)
    : await create(setData)

  saving.value = false

  if (result.success) {
    track(isEditing.value ? 'set:update_success' : 'set:create_success', {
      source: getSourcePage(),
      exercise_id: selectedExercise.value.id,
      exercise_slug: selectedExercise.value.slug,
      weight_kg: weightKg.value,
      reps: reps.value,
      has_notes: Boolean(notes.value)
    })

    toast.add({
      title: isEditing.value ? 'Set actualizado' : 'Set registrado',
      description: `${selectedExercise.value.name}: ${weightKg.value}kg × ${reps.value}`,
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    emit('update:open', false)
    emit('saved')
  } else {
    track(isEditing.value ? 'set:update_error' : 'set:create_error', {
      source: getSourcePage()
    })

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
  <!-- Reusable form template -->
  <DefineFormTemplate>
    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <!-- Exercise Select -->
      <UFormField label="Ejercicio">
        <USelectMenu
          v-model="selectedExercise"
          :items="exercises"
          size="xl"
          placeholder="Selecciona un ejercicio"
          label-key="name"
          class="w-full"
        />
      </UFormField>

      <!-- Weight & Reps in row -->
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Peso (kg)">
          <UInput
            v-model.number="weightKg"
            type="number"
            size="xl"
            step="0.5"
            min="0"
            placeholder="0"
          />
        </UFormField>

        <UFormField label="Reps">
          <UInput
            v-model.number="reps"
            type="number"
            size="xl"
            min="1"
            placeholder="0"
          />
        </UFormField>
      </div>

      <!-- Date -->
      <UFormField label="Fecha">
        <UInput
          v-model="date"
          type="date"
          size="xl"
        />
      </UFormField>

      <!-- Notes (optional) -->
      <UFormField label="Notas (opcional)">
        <UTextarea
          v-model="notes"
          placeholder="RPE, sensaciones, etc."
          :rows="2"
          size="xl"
        />
      </UFormField>

      <!-- Buttons -->
      <div class="flex gap-2 pt-2">
        <UButton
          size="xl"
          color="neutral"
          variant="soft"
          @click="emit('update:open', false)"
        >
          Cancelar
        </UButton>
        <UButton
          size="xl"
          type="submit"
          :loading="saving"
          :disabled="!isValid"
        >
          {{ isEditing ? 'Actualizar' : 'Guardar' }}
        </UButton>
      </div>
    </form>
  </DefineFormTemplate>

  <!-- Desktop: Modal -->
  <UModal
    v-if="isDesktop"
    :open="open"
    :title="title"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <ReuseFormTemplate />
    </template>
  </UModal>

  <!-- Mobile: Drawer -->
  <UDrawer
    v-else
    :open="open"
    :title="title"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="w-full max-w-md mx-auto pb-8">
        <ReuseFormTemplate />
      </div>
    </template>
  </UDrawer>
</template>

/**
 * Global state for login modal
 * Allows opening the login modal from anywhere (middleware, components, etc.)
 */
const showLoginModal = ref(false)

export function useLoginModal() {
  const open = () => {
    showLoginModal.value = true
  }

  const close = () => {
    showLoginModal.value = false
  }

  return {
    isOpen: showLoginModal,
    open,
    close
  }
}

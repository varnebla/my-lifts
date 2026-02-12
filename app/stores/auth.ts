import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: {
    id: string
    email: string | null
    avatar: string | null
    name: string | null
  } | null
  loading: boolean
  initialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.user,
    userEmail: (state): string | null => state.user?.email ?? null,
    userAvatar: (state): string | null => state.user?.avatar ?? null,
    userName: (state): string | null => state.user?.name ?? null
  },

  actions: {
    /**
     * Set user from server plugin (validated via getUser())
     */
    setUser(user: User) {
      this.user = {
        id: user.id,
        email: user.email ?? null,
        avatar: user.user_metadata?.avatar_url ?? null,
        name: user.user_metadata?.full_name ?? null
      }
      this.initialized = true
    },

    /**
     * Initialize/refresh auth state from server
     */
    async initialize(force = false) {
      if (this.initialized && !force) return

      this.loading = true
      try {
        const data = await $fetch<{
          user: {
            id: string
            email?: string
            avatar?: string
            name?: string
          } | null
        }>('/api/auth/user')

        if (data.user) {
          this.user = {
            id: data.user.id,
            email: data.user.email ?? null,
            avatar: data.user.avatar ?? null,
            name: data.user.name ?? null
          }
        } else {
          this.user = null
        }

        this.initialized = true
      } catch (error) {
        console.error('[Auth Store] Initialize error:', error)
        this.user = null
      } finally {
        this.loading = false
      }
    },

    /**
     * Clear auth state (used on logout)
     */
    clearAuth() {
      this.user = null
      this.initialized = false
    }
  }
})

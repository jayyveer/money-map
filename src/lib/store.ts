import { create } from 'zustand'
import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: any
  setUser: (user: User | null) => void
  setProfile: (profile: any) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
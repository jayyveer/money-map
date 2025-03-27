import { supabase } from './supabase'

export const api = {
  epf: {
    getAll: async (userId: string) => {
      const { data, error } = await supabase
        .from('epf_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data
    },
    add: async (userId: string, contribution: any) => {
      const { data, error } = await supabase
        .from('epf_contributions')
        .insert([{ ...contribution, user_id: userId }])
        .select()
      
      if (error) throw error
      return data[0]
    }
  },
  investments: {
    getAll: async (userId: string) => {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data
    },
    add: async (userId: string, investment: any) => {
      const { data, error } = await supabase
        .from('investments')
        .insert([{ ...investment, user_id: userId }])
        .select()
      
      if (error) throw error
      return data[0]
    }
  },
  profile: {
    get: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    upsert: async (profile: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
      
      if (error) throw error
      return data[0]
    }
  }
}
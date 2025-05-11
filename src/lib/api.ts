import { supabase } from './supabase'
import { startOfMonth, getDate, parseISO, isSameMonth, isBefore, isAfter } from 'date-fns'

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
  },

  // Centralized function to check for missing monthly entries
  checkMonthlyEntries: async (userId: string) => {
    if (!userId) return { epfAdded: false, investmentsAdded: false };

    let epfAdded = false;
    let investmentsAdded = false;

    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // 1. Check EPF contributions (deducted on 5th of each month)
      const { data: epfData } = await supabase
        .from('epf_contributions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      // Check if there's a contribution for the current month
      const hasCurrentMonthEPF = epfData?.some(contribution => {
        const contributionDate = parseISO(contribution.date);
        return contributionDate.getMonth() === currentMonth &&
               contributionDate.getFullYear() === currentYear;
      });

      // Add EPF contribution if missing for current month and we're past the 5th
      if (!hasCurrentMonthEPF && getDate(today) >= 5) {
        const contributionDate = new Date(currentYear, currentMonth, 5);

        const newContribution = {
          user_id: userId,
          amount: 3600,
          date: contributionDate.toISOString().split('T')[0],
          notes: 'Automatically added monthly EPF contribution'
        };

        const { error } = await supabase
          .from('epf_contributions')
          .insert([newContribution]);

        if (!error) epfAdded = true;
      }

      // 2. Check SIP investments (deducted on 25th of each month)
      const { data: sipData } = await supabase
        .from('sip_investments')
        .select('*')
        .eq('user_id', userId);

      const { data: investmentData } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId);

      const currentMonthStart = startOfMonth(today);

      // For each active SIP, check if there's an entry for this month
      for (const sip of (sipData || [])) {
        const startDate = parseISO(sip.start_date);
        const endDate = sip.end_date ? parseISO(sip.end_date) : null;

        // Skip if SIP is not active for current month
        if (
          isBefore(currentMonthStart, startDate) ||
          (endDate && isAfter(currentMonthStart, endDate))
        ) {
          continue;
        }

        // Check if there's already an investment entry for this SIP this month
        const hasEntryThisMonth = investmentData?.some(
          inv => inv.sip_investment_id === sip.id &&
                isSameMonth(parseISO(inv.date), currentMonthStart)
        );

        // Add investment if missing for current month and we're past the 25th
        if (!hasEntryThisMonth && getDate(today) >= 25) {
          const investmentDate = new Date(currentYear, currentMonth, 25);

          const newInvestment = {
            user_id: userId,
            sip_investment_id: sip.id,
            type: 'SIP',
            name: sip.fund_name,
            amount: sip.amount,
            date: investmentDate.toISOString().split('T')[0],
            notes: 'Automatically added monthly SIP investment'
          };

          const { error } = await supabase
            .from('investments')
            .insert([newInvestment]);

          if (!error) investmentsAdded = true;
        }
      }

      return { epfAdded, investmentsAdded };
    } catch (error) {
      console.error('Error checking monthly entries:', error);
      return { epfAdded: false, investmentsAdded: false };
    }
  }
}
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parse, isAfter, startOfMonth, getDate } from 'date-fns'

interface EPFContribution {
  id: number
  user_id: string
  amount: number
  date: string
  created_at: string
}

export function EPFSection() {
  const [contributions, setContributions] = useState<EPFContribution[]>([])
  const [totalContribution, setTotalContribution] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()

  // Function to fetch EPF contributions
  const fetchContributions = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('epf_contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (error) throw error

      setContributions(data || [])
      
      // Calculate total
      const total = (data || []).reduce((sum, item) => sum + (item.amount || 0), 0)
      setTotalContribution(total)
    } catch (error) {
      console.error('Error fetching EPF contributions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to check and add automatic contribution if needed
  const addAutomaticContribution = async () => {
    if (!user) return
    
    const today = new Date()
    const currentMonth = startOfMonth(today)
    const isAfterFifth = getDate(today) >= 5
    
    // Check if we should add an automatic contribution (on or after the 5th)
    if (!isAfterFifth) return
    
    // Check if there's already a contribution for this month
    const hasContributionThisMonth = contributions.some(contribution => {
      const contributionDate = new Date(contribution.date)
      return contributionDate.getMonth() === currentMonth.getMonth() && 
             contributionDate.getFullYear() === currentMonth.getFullYear()
    })
    
    if (!hasContributionThisMonth) {
      try {
        const newContribution = {
          user_id: user.id,
          amount: 3600,
          date: currentMonth.toISOString().split('T')[0], // Format as YYYY-MM-DD
        }
        
        const { error } = await supabase
          .from('epf_contributions')
          .insert([newContribution])
          
        if (error) throw error
        
        // Refresh contributions after adding
        await fetchContributions()
      } catch (error) {
        console.error('Error adding automatic contribution:', error)
      }
    }
  }

  useEffect(() => {
    fetchContributions()
  }, [user])
  
  useEffect(() => {
    if (contributions.length > 0) {
      addAutomaticContribution()
    }
  }, [contributions, user])

  // Format data for the chart
  const chartData = contributions.map(contribution => ({
    month: format(new Date(contribution.date), 'MMM yyyy'),
    amount: contribution.amount
  }))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>EPF Contributions</CardTitle>
          <CardDescription>Track your Employee Provident Fund contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-xl font-bold">Total EPF Contribution</h3>
            <p className="text-3xl font-bold text-primary">
              {isLoading ? 'Loading...' : `RM ${totalContribution.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          
          <div className="h-80 mt-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">Loading chart data...</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Amount']}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                No contribution data available. Data will be automatically added on the 5th of each month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
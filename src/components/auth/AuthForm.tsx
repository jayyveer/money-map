import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'

export function AuthForm() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  
  useEffect(() => {
    // Check current auth status on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        navigate('/dashboard')
      }
    })
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event)
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
          navigate('/dashboard')
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [navigate, setUser])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md dark:bg-gray-800">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to MoneyMap
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Your personal finance tracker
          </p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(37, 99, 235)',
                  brandAccent: 'rgb(29, 78, 216)',
                }
              }
            },
            className: {
              container: 'w-full',
              button: 'w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
              input: 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:border-gray-600',
              label: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
            }
          }}
          providers={[]}
        />
      </div>
    </div>
  )
}
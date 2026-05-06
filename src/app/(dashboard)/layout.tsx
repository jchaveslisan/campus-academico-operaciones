'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/pin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}

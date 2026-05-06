'use client'

import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { User, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RoleSwitcher() {
  const { activeView, setActiveView } = useAuth()

  return (
    <div className="flex rounded-xl bg-muted p-1 gap-1">
      <button
        id="view-personal"
        onClick={() => setActiveView('personal')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200',
          activeView === 'personal'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <User className="w-3.5 h-3.5" />
        Personal
      </button>
      <button
        id="view-admin"
        onClick={() => setActiveView('admin')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200',
          activeView === 'admin'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Jefatura
      </button>
    </div>
  )
}

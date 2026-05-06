'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, History, Award,
  Users, BookMarked, ClipboardList, BarChart3,
  LogOut, ChevronRight, Beaker
} from 'lucide-react'
import { toast } from 'sonner'
import RoleSwitcher from './RoleSwitcher'
import { cn } from '@/lib/utils'

const personalNav = [
  { href: '/home',         label: 'Mis Cursos',      icon: BookOpen },
  { href: '/history',      label: 'Mi Historial',    icon: History },
  { href: '/certificates', label: 'Certificados',    icon: Award },
]

const adminNav = [
  { href: '/admin',              label: 'Panel General',  icon: BarChart3 },
  { href: '/admin/courses',      label: 'Cursos',          icon: BookMarked },
  { href: '/admin/users',        label: 'Colaboradores',   icon: Users },
  { href: '/admin/enrollments',  label: 'Asignaciones',    icon: ClipboardList },
  { href: '/admin/reports',      label: 'Reportes',        icon: BarChart3 },
]

export default function Sidebar() {
  const { profile, activeView, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isJefatura = profile?.role === 'jefatura'
  const navItems = activeView === 'admin' ? adminNav : personalNav

  const handleSignOut = async () => {
    await signOut()
    toast.info('Sesión cerrada')
    router.push('/pin')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <Beaker className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Campus Académico</p>
            <p className="text-xs text-muted-foreground capitalize">{profile?.department}</p>
          </div>
        </div>

        {/* Role switcher */}
        {isJefatura && (
          <div className="px-4 pt-4">
            <RoleSwitcher />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/home' && item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-70" />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {profile?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.puesto}</p>
            </div>
          </div>
          <button
            id="sidebar-signout"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Campus Académico</span>
        </div>
        <button id="mobile-signout" onClick={handleSignOut} className="text-muted-foreground">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border flex justify-around py-2 px-2">
        {(activeView === 'personal' ? personalNav : adminNav).slice(0, 4).map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <item.icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[10px]', active ? 'text-primary font-medium' : 'text-muted-foreground')}>
                {item.label.split(' ')[0]}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

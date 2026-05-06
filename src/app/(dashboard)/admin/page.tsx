'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { getAllEnrollments } from '@/lib/services/enrollmentService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, BookMarked, ClipboardList, 
  TrendingUp, AlertCircle, CheckCircle2,
  ChevronRight, ArrowUpRight, BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { UserPublic } from '@/types/user.types'

export default function AdminDashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    complianceRate: 0,
    pendingAssignments: 0
  })
  const [deptStats, setDeptStats] = useState<{dept: string, pct: number}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const [usersData, coursesData, enrollmentsData] = await Promise.all([
        getAllUsers(),
        getActiveCourses(),
        getAllEnrollments()
      ])
      
      const totalEnrollments = enrollmentsData.length
      const passedEnrollments = enrollmentsData.filter(e => e.status === 'passed').length
      const complianceRate = totalEnrollments > 0 ? Math.round((passedEnrollments / totalEnrollments) * 100) : 0
      const pending = enrollmentsData.filter(e => e.status !== 'passed').length

      // Calculate Dept Stats
      const depts = ['produccion', 'mantenimiento', 'logistica']
      const calculatedDeptStats = depts.map(d => {
        const deptUsers = usersData.filter(u => u.department === d).map(u => u.uid)
        const deptEnrollments = enrollmentsData.filter(e => deptUsers.includes(e.userId))
        const deptPassed = deptEnrollments.filter(e => e.status === 'passed').length
        const pct = deptEnrollments.length > 0 ? Math.round((deptPassed / deptEnrollments.length) * 100) : 0
        return { 
          dept: d.charAt(0).toUpperCase() + d.slice(1), 
          pct 
        }
      })

      setStats({
        totalUsers: usersData.length,
        totalCourses: coursesData.length,
        complianceRate,
        pendingAssignments: pending
      })
      setDeptStats(calculatedDeptStats)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { title: 'Colaboradores', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10', href: '/admin/users' },
    { title: 'Cursos Activos', value: stats.totalCourses, icon: BookMarked, color: 'text-indigo-600', bg: 'bg-indigo-500/10', href: '/admin/courses' },
    { title: 'Asignaciones', value: stats.pendingAssignments, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-500/10', href: '/admin/enrollments' },
    { title: 'Cumplimiento', value: `${stats.complianceRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-500/10', href: '/admin/reports' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Control Jefatura</h1>
        <p className="text-muted-foreground">Resumen operativo y estado de cumplimiento normativo.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={card.href}>
              <Card className="hover:shadow-lg transition-all cursor-pointer border-border/50 group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-xl ${card.bg}`}>
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold mt-1">{loading ? '...' : card.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compliance Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cumplimiento por Departamento</CardTitle>
                <CardDescription>Estado de aprobaciones vs. asignaciones totales.</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 bg-muted w-1/4 rounded" />
                  <div className="h-2 bg-muted w-full rounded" />
                </div>
              ))
            ) : deptStats.length > 0 ? (
              deptStats.map((d) => (
                <div key={d.dept} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{d.dept}</span>
                    <span className="text-muted-foreground">{d.pct}%</span>
                  </div>
                  <Progress value={d.pct} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay datos de departamentos.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6">
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4" />
                Alertas de Vencimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-700">4</p>
              <p className="text-xs text-amber-600 mt-1">Colaboradores con cursos por vencer esta semana.</p>
              <Link href="/admin/reports">
                <Button variant="link" className="text-amber-700 p-0 h-auto text-xs mt-4">Ver detalles →</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/admin/courses/new">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm h-11">
                  <BookMarked className="w-4 h-4" />
                  Publicar nuevo curso
                </Button>
              </Link>
              <Link href="/admin/enrollments">
                <Button variant="outline" className="w-full justify-start gap-2 text-sm h-11">
                  <Users className="w-4 h-4" />
                  Asignar capacitación
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

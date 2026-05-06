'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyEnrollments } from '@/lib/services/enrollmentService'
import { getCourseById } from '@/lib/services/courseService'
import { EnrollmentDocument, EnrollmentStatus } from '@/types/enrollment.types'
import { CourseDocument } from '@/types/course.types'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, CheckCircle, AlertTriangle, ChevronRight, Award } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, isPast, isWithinInterval, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

type EnrollmentWithCourse = EnrollmentDocument & { course: CourseDocument | null }

const statusConfig: Record<EnrollmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:     { label: 'Pendiente',    color: 'bg-amber-500/15 text-amber-600 border-amber-500/30',    icon: Clock },
  in_progress: { label: 'En Progreso',  color: 'bg-blue-500/15 text-blue-600 border-blue-500/30',       icon: BookOpen },
  passed:      { label: 'Aprobado',     color: 'bg-green-500/15 text-green-600 border-green-500/30',    icon: CheckCircle },
  failed:      { label: 'Reprobado',    color: 'bg-red-500/15 text-red-600 border-red-500/30',          icon: AlertTriangle },
  expired:     { label: 'Vencido',      color: 'bg-gray-500/15 text-gray-600 border-gray-500/30',       icon: AlertTriangle },
}

export default function HomePage() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadEnrollments()
  }, [profile])

  const loadEnrollments = async () => {
    setLoading(true)
    const rawEnrollments = await getMyEnrollments(profile!.uid)
    const withCourses = await Promise.all(
      rawEnrollments.map(async (e) => ({
        ...e,
        course: await getCourseById(e.courseId),
      }))
    )
    setEnrollments(withCourses)
    setLoading(false)
  }

  const pending = enrollments.filter((e) => e.status === 'pending' || e.status === 'in_progress' || e.status === 'failed')
  const passed  = enrollments.filter((e) => e.status === 'passed')
  const expired = enrollments.filter((e) => e.status === 'expired')
  const expiringSoon = enrollments.filter((e) => {
    if (e.status !== 'passed' || !e.expiresAt) return false
    const expiryDate = e.expiresAt instanceof Date ? e.expiresAt : (e.expiresAt as any).toDate()
    return isWithinInterval(expiryDate, { start: new Date(), end: subDays(new Date(), -30) })
  })

  const completionPct = enrollments.length > 0
    ? Math.round((passed.length / enrollments.length) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Bienvenido, {profile?.displayName?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {profile?.puesto} · {profile?.department}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendientes',   value: pending.length,  icon: Clock,         color: 'text-amber-500'  },
          { label: 'Completados',  value: passed.length,   icon: CheckCircle,   color: 'text-green-500'  },
          { label: 'Vencidos',     value: expired.length,  icon: AlertTriangle, color: 'text-red-500'    },
          { label: 'Total',        value: enrollments.length, icon: BookOpen,   color: 'text-primary'    },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Compliance progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Mi Cumplimiento General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">{completionPct}%</span>
            <Award className="w-5 h-5 text-primary" />
          </div>
          <Progress value={completionPct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{passed.length} de {enrollments.length} capacitaciones aprobadas</p>
        </CardContent>
      </Card>

      {/* Urgent / Expiring alerts */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Atención requerida
          </div>
          {expired.map((e) => (
            <Link key={e.enrollmentId} href={`/courses/${e.courseId}?enrollmentId=${e.enrollmentId}`} className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2 hover:bg-red-500/15 transition-colors">
              <span className="text-sm font-medium text-red-600">{e.course?.title ?? 'Curso'} — Vencido</span>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </Link>
          ))}
          {expiringSoon.map((e) => (
            <Link key={e.enrollmentId} href={`/courses/${e.courseId}?enrollmentId=${e.enrollmentId}`} className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 hover:bg-amber-500/15 transition-colors">
              <span className="text-sm font-medium text-amber-600">{e.course?.title ?? 'Curso'} — Por vencer</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </Link>
          ))}
        </div>
      )}

      {/* Pending courses */}
      <div>
        <h2 className="font-semibold text-base mb-3">Capacitaciones Pendientes</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
            <p className="font-medium">¡Todo al día!</p>
            <p className="text-sm">No tienes capacitaciones pendientes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((e, i) => {
              const cfg = statusConfig[e.status]
              return (
                <motion.div
                  key={e.enrollmentId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link href={`/courses/${e.courseId}?enrollmentId=${e.enrollmentId}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{e.course?.title ?? 'Cargando...'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {e.dueDate
                              ? `Vence ${formatDistanceToNow((e.dueDate as any).toDate?.() ?? e.dueDate, { addSuffix: true, locale: es })}`
                              : 'Sin fecha límite'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs border ${cfg.color}`}>{cfg.label}</Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

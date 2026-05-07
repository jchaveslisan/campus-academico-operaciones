'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyEnrollments } from '@/lib/services/enrollmentService'
import { getCourseById } from '@/lib/services/courseService'
import { EnrollmentDocument, EnrollmentStatus } from '@/types/enrollment.types'
import { CourseDocument } from '@/types/course.types'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BookOpen, Clock, CheckCircle, 
  AlertTriangle, ChevronDown, Award, 
  ExternalLink, FileText, PlayCircle 
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, isWithinInterval, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const pending = enrollments.filter((e) => e.status !== 'passed' && e.status !== 'expired')
  const passed  = enrollments.filter((e) => e.status === 'passed')
  const completionPct = enrollments.length > 0 ? Math.round((passed.length / enrollments.length) * 100) : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mini Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hola, {profile?.displayName?.split(' ')[0]}
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {profile?.puesto} · {profile?.department}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Mi Progreso</p>
          <p className="text-2xl font-black text-primary">{completionPct}%</p>
        </div>
      </div>

      <Progress value={completionPct} className="h-1.5" />

      {/* Course List Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Catálogo Personal</h2>
          <Badge variant="outline" className="text-[10px]">{pending.length} Pendientes</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No tienes cursos asignados aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {enrollments.map((e) => {
              const cfg = statusConfig[e.status]
              const isExpanded = expandedId === e.enrollmentId
              const course = e.course

              return (
                <Card 
                  key={e.enrollmentId} 
                  className={cn(
                    "overflow-hidden transition-all duration-300 border-border/60",
                    isExpanded ? "ring-2 ring-primary/20 shadow-xl" : "hover:bg-slate-50"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Compact Row */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : e.enrollmentId)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                          e.status === 'passed' ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                        )}>
                          {e.status === 'passed' ? <CheckCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {course?.title || 'Cargando...'}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            VERSIÓN {e.versionNumber}.0
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={cn("text-[9px] h-5 border px-2", cfg.color)}>
                          {cfg.label}
                        </Badge>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-300",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-4 pb-5 pt-0 border-t bg-slate-50/50 space-y-4">
                            <div className="mt-4">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {course?.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {/* Go to Course */}
                              <Link href={`/courses/${e.courseId}?enrollmentId=${e.enrollmentId}`} className="flex-1 min-w-[150px]">
                                <Button className="w-full h-10 gap-2 text-xs font-bold shadow-md shadow-primary/20">
                                  <PlayCircle className="w-4 h-4" />
                                  {e.status === 'passed' ? 'Repasar Curso' : 'Iniciar Capacitación'}
                                </Button>
                              </Link>

                              {/* Direct Link to Material (Requirement 2) */}
                              {course?.documentUrl && (
                                <a 
                                  href={course.documentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex-1 min-w-[150px]"
                                >
                                  <Button variant="outline" className="w-full h-10 gap-2 text-xs bg-white">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Material de Referencia
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  </Button>
                                </a>
                              )}
                            </div>

                            {e.status === 'passed' && (
                              <div className={cn(
                                "flex items-center gap-2 text-[10px] font-bold p-2 rounded-lg border",
                                e.expiresAt ? "text-blue-600 bg-blue-50 border-blue-100" : "text-green-600 bg-green-50 border-green-100"
                              )}>
                                <Award className="w-3 h-3" />
                                {e.expiresAt 
                                  ? `VENCE EL: ${new Date((e.expiresAt as any).toDate?.() ?? e.expiresAt).toLocaleDateString('es-CR')}`
                                  : 'CERTIFICADO PERMANENTE / NO VENCE'}
                              </div>
                            )}

                            {e.status !== 'passed' && e.dueDate && (
                              <div className="flex items-center gap-2 text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100">
                                <Clock className="w-3 h-3" />
                                FECHA LÍMITE: {formatDistanceToNow((e.dueDate as any).toDate?.() ?? e.dueDate, { addSuffix: true, locale: es }).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

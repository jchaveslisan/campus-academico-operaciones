'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCourseById, getCourseVersionHistory } from '@/lib/services/courseService'
import { getAllEnrollments } from '@/lib/services/enrollmentService'
import { getAllUsers } from '@/lib/services/userService'
import { CourseDocument, CourseVersionDocument } from '@/types/course.types'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, History, Users, 
  Settings, Plus, FileText, 
  Video, Calendar, CheckCircle2,
  AlertTriangle, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CourseManagementPage() {
  const { courseId } = useParams() as { courseId: string }
  const [course, setCourse] = useState<CourseDocument | null>(null)
  const [versions, setVersions] = useState<CourseVersionDocument[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [c, vHistory, allE, allU] = await Promise.all([
        getCourseById(courseId),
        getCourseVersionHistory(courseId),
        getAllEnrollments(),
        getAllUsers()
      ])
      
      if (!c) throw new Error('Curso no encontrado')
      setCourse(c)
      setVersions(vHistory)
      setEnrollments(allE.filter(e => e.courseId === courseId))
      setUsers(allU)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center">Cargando gestión de curso...</div>
  if (!course) return <div className="p-10 text-center">Curso no encontrado</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <Badge className="bg-primary">v{course.currentVersion}.0</Badge>
          </div>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Versión
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version History */}
        <div className="lg:col-span-1 space-y-6">
          <Card h-full>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Historial de Versiones
              </CardTitle>
              <CardDescription>Registro de cambios del procedimiento.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {versions.map((v) => (
                  <div key={v.versionId} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Versión {v.versionNumber}.0</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format((v.publishedAt as any).toDate?.() || new Date(v.publishedAt), 'PP', { locale: es })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">"{v.changeLog}"</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <Video className="w-3 h-3" /> Video OK
                      </Badge>
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <FileText className="w-3 h-3" /> {v.quiz.length} Preguntas
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrollments Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-green-500/5 border-green-500/10">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-black text-green-600">{enrollments.filter(e => e.status === 'passed').length}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/10">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-black text-amber-600">{enrollments.filter(e => e.status === 'pending' || e.status === 'in_progress').length}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/10">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-black text-red-600">{enrollments.filter(e => e.status === 'expired').length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Estado de Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="p-4 font-medium">Colaborador</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Versión</th>
                    <th className="p-4 font-medium">Último Intento</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enrollments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-muted-foreground">No hay colaboradores asignados a este curso.</td>
                    </tr>
                  ) : (
                    enrollments.map((e) => {
                      const user = users.find(u => u.uid === e.userId)
                      return (
                        <tr key={e.enrollmentId} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">{user?.displayName || 'Cargando...'}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{user?.department}</div>
                          </td>
                          <td className="p-4">
                            {e.status === 'passed' ? (
                              <Badge className="bg-green-500 gap-1"><CheckCircle2 className="w-3 h-3" /> Al día</Badge>
                            ) : e.status === 'expired' ? (
                              <Badge className="bg-red-500 gap-1"><AlertTriangle className="w-3 h-3" /> Vencido</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pendiente</Badge>
                            )}
                          </td>
                          <td className="p-4 text-xs font-mono">v{e.versionNumber}.0</td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {e.lastAttemptAt ? format((e.lastAttemptAt as any).toDate?.() || new Date(e.lastAttemptAt), 'Pp', { locale: es }) : 'N/A'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

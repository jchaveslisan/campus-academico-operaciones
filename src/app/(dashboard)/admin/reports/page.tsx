'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { getMyEnrollments } from '@/lib/services/enrollmentService'
import { CourseDocument } from '@/types/course.types'
import { UserPublic } from '@/types/user.types'
import { EnrollmentDocument, EnrollmentStatus } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, FileDown, Filter, 
  Search, CheckCircle2, AlertTriangle, 
  Clock, Minus, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminReportsPage() {
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cData, uData] = await Promise.all([
        getActiveCourses(),
        getAllUsers()
      ])
      setCourses(cData)
      setUsers(uData)
      
      // Load all enrollments for everyone (Simplified for MVP)
      // In a real app, this should be a specific admin service
      const allEnrollmentsPromises = uData.map(u => getMyEnrollments(u.uid))
      const allEnrollmentsResults = await Promise.all(allEnrollmentsPromises)
      setEnrollments(allEnrollmentsResults.flat())
    } catch (error) {
      toast.error('Error al cargar datos del heatmap')
    } finally {
      setLoading(false)
    }
  }

  const getStatus = (userId: string, courseId: string): EnrollmentStatus | 'none' => {
    const e = enrollments.find(e => e.userId === userId && e.courseId === courseId)
    return e ? e.status : 'none'
  }

  const StatusIcon = ({ status }: { status: EnrollmentStatus | 'none' }) => {
    switch (status) {
      case 'passed':      return <div className="w-5 h-5 rounded-md bg-green-500 shadow-sm shadow-green-500/40 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>
      case 'expired':     return <div className="w-5 h-5 rounded-md bg-red-500 shadow-sm shadow-red-500/40 flex items-center justify-center"><AlertTriangle className="w-3 h-3 text-white" /></div>
      case 'pending':     
      case 'in_progress':
      case 'failed':      return <div className="w-5 h-5 rounded-md bg-amber-500 shadow-sm shadow-amber-500/40 flex items-center justify-center"><Clock className="w-3 h-3 text-white" /></div>
      default:            return <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center"><Minus className="w-3 h-3 text-muted-foreground/30" /></div>
    }
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cedula.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporte de Cumplimiento</h1>
          <p className="text-muted-foreground">Heatmap en tiempo real del estado de capacitaciones.</p>
        </div>
        
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por colaborador..."
            className="pl-8"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><StatusIcon status="passed" /> <span className="text-muted-foreground">Vigente</span></div>
          <div className="flex items-center gap-1.5"><StatusIcon status="pending" /> <span className="text-muted-foreground">Pendiente</span></div>
          <div className="flex items-center gap-1.5"><StatusIcon status="expired" /> <span className="text-muted-foreground">Vencido</span></div>
          <div className="flex items-center gap-1.5"><StatusIcon status="none" /> <span className="text-muted-foreground">N/A</span></div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/40 shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-4 text-left font-bold text-xs uppercase tracking-wider border-r min-w-[250px] sticky left-0 bg-muted/50 z-10">Colaborador</th>
                  {courses.map(course => (
                    <th key={course.courseId} className="p-4 text-center min-w-[140px] border-r last:border-r-0">
                      <div className="text-[10px] uppercase font-black text-muted-foreground mb-1">Curso</div>
                      <div className="text-xs font-bold line-clamp-1" title={course.title}>{course.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4 border-r sticky left-0 bg-background"><div className="h-4 bg-muted w-3/4 rounded" /></td>
                      {courses.map(c => <td key={c.courseId} className="p-4 border-r last:border-r-0"><div className="h-5 w-5 bg-muted rounded mx-auto" /></td>)}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={courses.length + 1} className="p-10 text-center text-muted-foreground">No hay datos para mostrar.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 border-r sticky left-0 bg-background/95 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {user.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-none">{user.displayName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{user.puesto}</p>
                          </div>
                        </div>
                      </td>
                      {courses.map(course => {
                        const status = getStatus(user.uid, course.courseId)
                        return (
                          <td key={course.courseId} className="p-4 border-r last:border-r-0">
                            <div className="flex justify-center">
                              <StatusIcon status={status} />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Tasa de Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">84.2%</div>
            <Progress value={84.2} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-600">{enrollments.filter(e => e.status === 'passed').length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Capacitaciones aprobadas</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">Vencidas / Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">{enrollments.filter(e => e.status !== 'passed').length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Input(props: any) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    />
  )
}

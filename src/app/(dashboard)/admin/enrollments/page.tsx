'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { assignCourse } from '@/lib/services/enrollmentService'
import { CourseDocument } from '@/types/course.types'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ClipboardList, Search, User, 
  BookMarked, Calendar, CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'

export default function AdminEnrollmentsPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [dueDate, setDueDate] = useState('')

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
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedCourseId || !selectedUserId) {
      toast.error('Seleccione colaborador y curso')
      return
    }

    const course = courses.find(c => c.courseId === selectedCourseId)
    if (!course) return

    setLoading(true)
    try {
      await assignCourse(
        selectedUserId,
        selectedCourseId,
        course.latestVersionId,
        course.currentVersion,
        profile!.uid,
        dueDate ? new Date(dueDate) : null
      )
      toast.success('Curso asignado exitosamente')
      setSelectedUserId('')
      setDueDate('')
    } catch (error) {
      toast.error('Error al asignar curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asignación de Capacitaciones</h1>
        <p className="text-muted-foreground">Vincula cursos a colaboradores específicos para su seguimiento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-xl border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Nueva Asignación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Seleccionar Colaborador
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Busque por nombre o cédula" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.uid} value={u.uid}>
                      {u.displayName} ({u.cedula}) — {u.puesto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" />
                Seleccionar Curso
              </label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Procedimiento o normativa" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.courseId} value={c.courseId}>
                      {c.title} (v{c.currentVersion})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Fecha Límite (Opcional)
              </label>
              <Input 
                type="date" 
                className="h-12"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Si no se especifica, el curso no tendrá fecha de vencimiento inicial para completarse.</p>
            </div>

            <Button 
              onClick={handleAssign} 
              disabled={loading}
              className="w-full h-12 gap-2 text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirmar Asignación
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cursos</p>
                  <p className="font-bold">{courses.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Usuarios</p>
                  <p className="font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 leading-normal">
              La asignación genera un registro inmutable en el historial del colaborador. Asegúrese de que la versión del curso sea la correcta según el plan de capacitación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  AlertCircle, Users, Check, X
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminEnrollmentsPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
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

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.uid)
    setSelectedUserIds(prev => Array.from(new Set([...prev, ...filteredIds])))
  }

  const handleBulkAssign = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0) {
      toast.error('Seleccione al menos un colaborador y un curso')
      return
    }

    const course = courses.find(c => c.courseId === selectedCourseId)
    if (!course) return

    setLoading(true)
    let successCount = 0
    try {
      // We process assignments in parallel
      await Promise.all(selectedUserIds.map(userId => 
        assignCourse(
          userId,
          selectedCourseId,
          course.latestVersionId,
          course.currentVersion,
          profile!.uid,
          dueDate ? new Date(dueDate) : null
        ).then(() => successCount++)
      ))
      
      toast.success(`${successCount} capacitaciones asignadas exitosamente`)
      setSelectedUserIds([])
      setDueDate('')
    } catch (error) {
      toast.error('Error durante la asignación masiva')
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.cedula.includes(userSearch) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jornadas de Capacitación</h1>
          <p className="text-muted-foreground">Asigna un curso a múltiples colaboradores simultáneamente.</p>
        </div>
        <Badge variant="outline" className="h-fit py-1 px-3 gap-2 bg-primary/5 text-primary border-primary/20">
          <Users className="w-4 h-4" />
          {selectedUserIds.length} seleccionados
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                1. Seleccionar Colaboradores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b bg-white flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar por nombre, cédula o departamento..."
                    className="pl-8"
                    value={userSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={selectAllFiltered} className="text-xs">
                  Marcar filtrados
                </Button>
                {selectedUserIds.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedUserIds([])} className="text-red-500 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <div className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground text-sm">
                      No se encontraron colaboradores con ese filtro.
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <div 
                        key={u.uid} 
                        className={cn(
                          "flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors",
                          selectedUserIds.includes(u.uid) && "bg-primary/5"
                        )}
                        onClick={() => toggleUser(u.uid)}
                      >
                        <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{u.displayName}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">{u.department}</span>
                            <span className="text-[10px] text-muted-foreground">ID: {u.cedula}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase">{u.puesto}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Config & Action */}
        <div className="space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-primary" />
                2. Configurar Curso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Curso</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Elegir procedimiento" />
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
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha Límite (Opcional)</label>
                <Input 
                  type="date" 
                  className="h-11"
                  value={dueDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleBulkAssign} 
                  disabled={loading || selectedUserIds.length === 0 || !selectedCourseId}
                  className="w-full h-14 gap-2 text-base font-bold shadow-lg shadow-primary/20"
                >
                  {loading ? 'Asignando...' : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Asignar a {selectedUserIds.length} personas
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-3 leading-relaxed px-4">
                  Se generará un registro individual para cada colaborador seleccionado.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 leading-normal">
              <strong>Control de Calidad:</strong> La asignación masiva es útil para jornadas presenciales o actualizaciones normativas globales.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

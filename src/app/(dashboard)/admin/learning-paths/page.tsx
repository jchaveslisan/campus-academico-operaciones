'use client'

import { useState, useEffect } from 'react'
import { getLearningPaths, createLearningPath, updateLearningPath, assignLearningPath } from '@/lib/services/learningPathService'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { LearningPath } from '@/types/learningPath.types'
import { CourseDocument } from '@/types/course.types'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, ClipboardList, BookOpen, Users, 
  Trash2, ChevronRight, CheckCircle2, Loader2,
  Search, BookMarked, Settings2, GraduationCap
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export default function AdminLearningPathsPage() {
  const { profile } = useAuth()
  const [paths, setPaths] = useState<LearningPath[]>([])
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseIds: [] as string[]
  })
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pData, cData, uData] = await Promise.all([
        getLearningPaths(),
        getActiveCourses(),
        getAllUsers()
      ])
      setPaths(pData)
      setCourses(cData)
      setUsers(uData)
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.courseIds.length === 0) {
      toast.error('Seleccione al menos un curso')
      return
    }
    setLoading(true)
    try {
      await createLearningPath(formData)
      toast.success('Ruta de aprendizaje creada')
      setIsCreateDialogOpen(false)
      setFormData({ title: '', description: '', courseIds: [] })
      loadData()
    } catch (error) {
      toast.error('Error al crear ruta')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignPath = async () => {
    if (!selectedPath || selectedUserIds.length === 0) return
    setLoading(true)
    try {
      await Promise.all(selectedUserIds.map(uid => 
        assignLearningPath(uid, selectedPath, profile!.uid)
      ))
      toast.success(`Ruta asignada a ${selectedUserIds.length} personas`)
      setIsAssignDialogOpen(false)
      setSelectedUserIds([])
    } catch (error) {
      toast.error('Error al asignar ruta')
    } finally {
      setLoading(false)
    }
  }

  const toggleCourse = (id: string) => {
    setFormData(prev => ({
      ...prev,
      courseIds: prev.courseIds.includes(id) 
        ? prev.courseIds.filter(i => i !== id) 
        : [...prev.courseIds, id]
    }))
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.cedula.includes(userSearch)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rutas de Aprendizaje</h1>
          <p className="text-muted-foreground">Crea currículos estructurados para diferentes puestos.</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20 h-12">
              <Plus className="w-4 h-4" />
              Nueva Ruta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <form onSubmit={handleCreatePath} className="flex flex-col h-full overflow-hidden">
              <DialogHeader>
                <DialogTitle>Configurar Ruta de Aprendizaje</DialogTitle>
                <DialogDescription>
                  Define un nombre y selecciona los cursos que formarán parte de esta ruta.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título de la Ruta</label>
                  <Input 
                    required 
                    placeholder="Ej: Inducción para Operarios de Empaque" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Input 
                    placeholder="Breve explicación del objetivo de esta ruta" 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar Cursos ({formData.courseIds.length})</label>
                  <div className="border rounded-xl overflow-hidden divide-y">
                    {courses.map(c => (
                      <div 
                        key={c.courseId} 
                        className={cn(
                          "flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors",
                          formData.courseIds.includes(c.courseId) && "bg-primary/5"
                        )}
                        onClick={() => toggleCourse(c.courseId)}
                      >
                        <Checkbox checked={formData.courseIds.includes(c.courseId)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">v{c.currentVersion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12 px-10">
                  {loading ? <Loader2 className="animate-spin" /> : 'Crear Ruta'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && paths.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-[200px] bg-slate-100" />
          ))
        ) : paths.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <GraduationCap className="w-8 h-8" />
             </div>
             <p className="text-muted-foreground">Aún no se han definido rutas de aprendizaje.</p>
          </div>
        ) : (
          paths.map((p) => (
            <Card key={p.id} className="group hover:shadow-xl transition-all border-none shadow-lg">
              <CardHeader className="pb-3 bg-slate-50/50">
                <div className="flex justify-between items-start gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="bg-white border-slate-200">{p.courseIds.length} cursos</Badge>
                </div>
                <CardTitle className="mt-4 text-lg leading-tight">{p.title}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cursos incluidos:</p>
                  <div className="space-y-1">
                    {p.courseIds.slice(0, 2).map(cid => {
                      const c = courses.find(cc => cc.courseId === cid)
                      return (
                        <div key={cid} className="flex items-center gap-2 text-xs text-slate-600 truncate">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {c?.title || cid}
                        </div>
                      )
                    })}
                    {p.courseIds.length > 2 && (
                      <p className="text-[10px] text-muted-foreground italic">+ {p.courseIds.length - 2} cursos más</p>
                    )}
                  </div>
                </div>
                <Button 
                  className="w-full gap-2 rounded-xl group-hover:bg-primary transition-colors"
                  variant="outline"
                  onClick={() => {
                    setSelectedPath(p)
                    setIsAssignDialogOpen(true)
                  }}
                >
                  <Users className="w-4 h-4" />
                  Asignar Ruta
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col h-[80vh]">
          <DialogHeader>
            <DialogTitle>Asignar Ruta: {selectedPath?.title}</DialogTitle>
            <DialogDescription>
              Se asignarán los {selectedPath?.courseIds.length} cursos de forma masiva a los colaboradores seleccionados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-2 border rounded-xl bg-slate-50 flex gap-2 mb-4">
             <Search className="w-4 h-4 text-muted-foreground mt-2 ml-2" />
             <Input 
               placeholder="Buscar personas..." 
               className="border-none bg-transparent h-8 text-xs focus-visible:ring-0" 
               value={userSearch}
               onChange={e => setUserSearch(e.target.value)}
             />
          </div>

          <div className="flex-1 overflow-y-auto divide-y border rounded-xl">
            {filteredUsers.map(u => (
              <div 
                key={u.uid} 
                className={cn(
                  "flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-slate-50",
                  selectedUserIds.includes(u.uid) && "bg-primary/5"
                )}
                onClick={() => setSelectedUserIds(prev => prev.includes(u.uid) ? prev.filter(i => i !== u.uid) : [...prev, u.uid])}
              >
                <Checkbox checked={selectedUserIds.includes(u.uid)} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-xs">{u.displayName}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{u.department} | {u.cedula}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button>
            <Button 
              disabled={loading || selectedUserIds.length === 0} 
              onClick={handleAssignPath}
              className="gap-2 h-12 px-8"
            >
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Asignar a {selectedUserIds.length} personas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

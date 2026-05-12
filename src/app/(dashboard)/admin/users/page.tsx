'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAllUsers } from '@/lib/services/userService'
import { getActiveCourses } from '@/lib/services/courseService'
import { getMyEnrollments, deleteEnrollment } from '@/lib/services/enrollmentService'
import { UserPublic } from '@/types/user.types'
import { CourseDocument } from '@/types/course.types'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, UserPlus, Filter, 
  Settings2, Mail, Shield, Briefcase,
  UserCheck, UserX, CheckCircle2, XCircle,
  Key, Trash2, BookMarked, Loader2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  
  // User Enrollments state
  const [userEnrollments, setUserEnrollments] = useState<EnrollmentDocument[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)

  // New User Form State
  const [formData, setFormData] = useState({
    displayName: '',
    cedula: '',
    email: '',
    department: 'produccion',
    puesto: '',
    role: 'colaborador',
    pin: ''
  })

  // Edit User Form State
  const [editFormData, setEditFormData] = useState<any>({
    displayName: '',
    email: '',
    department: 'produccion',
    puesto: '',
    role: 'colaborador',
    isActive: true,
    newPin: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [uData, cData] = await Promise.all([
        getAllUsers(),
        getActiveCourses()
      ])
      setUsers(uData)
      setCourses(cData)
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {}
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const idToken = await currentUser?.getIdToken()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...formData, createdBy: currentUser?.uid }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Usuario creado exitosamente')
      setIsCreateDialogOpen(false)
      setFormData({
        displayName: '',
        cedula: '',
        email: '',
        department: 'produccion',
        puesto: '',
        role: 'colaborador',
        pin: ''
      })
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const openEditDialog = async (u: UserPublic) => {
    setSelectedUser(u)
    setEditFormData({
      displayName: u.displayName,
      email: u.email,
      department: u.department,
      puesto: u.puesto,
      role: u.role,
      isActive: u.isActive,
      newPin: ''
    })
    setIsEditDialogOpen(true)
    
    // Load enrollments for this user
    setLoadingEnrollments(true)
    try {
      const enrolls = await getMyEnrollments(u.uid)
      setUserEnrollments(enrolls)
    } catch (error) {
      toast.error('Error al cargar capacitaciones del usuario')
    } finally {
      setLoadingEnrollments(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)
    try {
      const idToken = await currentUser?.getIdToken()
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          targetUid: selectedUser.uid,
          ...editFormData 
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Usuario actualizado correctamente')
      setIsEditDialogOpen(false)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!confirm('¿Está seguro de borrar esta asignación? El progreso se perderá permanentemente.')) return
    
    try {
      await deleteEnrollment(enrollmentId)
      setUserEnrollments(prev => prev.filter(e => e.enrollmentId !== enrollmentId))
      toast.success('Asignación eliminada correctamente')
    } catch (error) {
      toast.error('Error al eliminar asignación')
    }
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cedula.includes(searchTerm) ||
    u.puesto.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Colaboradores</h1>
          <p className="text-muted-foreground">Administra el personal, sus roles y accesos.</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <UserPlus className="w-4 h-4" />
              Nuevo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Registrar Colaborador</DialogTitle>
                <DialogDescription>
                  Ingresa los datos básicos para el acceso a la plataforma.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre Completo</label>
                  <Input 
                    required 
                    placeholder="Ej: Juan Pérez" 
                    value={formData.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cédula</label>
                    <Input 
                      required 
                      placeholder="Identificación" 
                      value={formData.cedula}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, cedula: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PIN (4-6 dígitos)</label>
                    <Input 
                      required 
                      type="password"
                      placeholder="****" 
                      maxLength={6}
                      value={formData.pin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Correo Electrónico {formData.role === 'jefatura' ? '(Obligatorio)' : '(Opcional)'}
                  </label>
                  <Input 
                    required={formData.role === 'jefatura'} 
                    type="email" 
                    placeholder={formData.role === 'jefatura' ? 'juan.perez@empresa.com' : 'Opcional para colaboradores'} 
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departamento</label>
                  <Select 
                    value={formData.department} 
                    onValueChange={v => setFormData({...formData, department: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="calidad">Calidad</SelectItem>
                      <SelectItem value="administracion">Administración</SelectItem>
                      <SelectItem value="id">I+D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Puesto / Cargo</label>
                  <Input 
                    required 
                    placeholder="Ej: Operario de Máquina" 
                    value={formData.puesto}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, puesto: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol del Sistema</label>
                  <Select 
                    value={formData.role} 
                    onValueChange={v => setFormData({...formData, role: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador (Aprendiz)</SelectItem>
                      <SelectItem value="jefatura">Jefatura (Administrador)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Crear Usuario'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog Corrected Structure */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Gestionar Colaborador
              </DialogTitle>
              <DialogDescription>
                Ajustes de cuenta y seguimiento académico de <strong>{selectedUser?.displayName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="enrollments">Capacitaciones</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 py-4">
                <form onSubmit={handleUpdateUser} className="space-y-4 max-h-[50vh] overflow-y-auto px-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre Completo</label>
                    <Input 
                      required 
                      value={editFormData.displayName}
                      onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Cédula</label>
                      <p className="text-sm font-mono bg-slate-50 p-2 rounded border truncate">{selectedUser?.cedula}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Key className="w-3 h-3 text-amber-500" />
                        Nuevo PIN
                      </label>
                      <Input 
                        type="password"
                        placeholder="Sin cambios" 
                        maxLength={6}
                        value={editFormData.newPin}
                        onChange={(e) => setEditFormData({...editFormData, newPin: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Departamento</label>
                    <Select 
                      value={editFormData.department} 
                      onValueChange={v => setEditFormData({...editFormData, department: v as any})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="produccion">Producción</SelectItem>
                        <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="logistica">Logística</SelectItem>
                        <SelectItem value="calidad">Calidad</SelectItem>
                        <SelectItem value="administracion">Administración</SelectItem>
                        <SelectItem value="id">I+D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Puesto / Cargo</label>
                    <Input 
                      required 
                      value={editFormData.puesto}
                      onChange={(e) => setEditFormData({...editFormData, puesto: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado</label>
                      <Select 
                        value={editFormData.isActive ? 'active' : 'inactive'} 
                        onValueChange={v => setEditFormData({...editFormData, isActive: v === 'active'})}
                      >
                        <SelectTrigger className={cn(
                          "font-bold",
                          editFormData.isActive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-green-600 font-bold">Activo</SelectItem>
                          <SelectItem value="inactive" className="text-red-600 font-bold">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rol</label>
                      <Select 
                        value={editFormData.role} 
                        onValueChange={v => setEditFormData({...editFormData, role: v as any})}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                          <SelectItem value="jefatura">Jefatura</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="pt-4 px-0">
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              <TabsContent value="enrollments" className="py-4">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {loadingEnrollments ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <p className="text-xs">Cargando historial...</p>
                    </div>
                  ) : userEnrollments.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-2xl text-muted-foreground">
                      <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm italic">Sin capacitaciones asignadas.</p>
                    </div>
                  ) : (
                    userEnrollments.map((e) => {
                      const course = courses.find(c => c.courseId === e.courseId)
                      return (
                        <div key={e.enrollmentId} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 group/item">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate pr-2">{course?.title || 'Curso desconocido'}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className={cn(
                                "text-[9px] px-1.5 h-4",
                                e.status === 'passed' ? "bg-green-100 text-green-700 border-green-200" :
                                e.status === 'failed' ? "bg-red-100 text-red-700 border-red-200" :
                                "bg-amber-100 text-amber-700 border-amber-200"
                              )}>
                                {e.status === 'passed' ? 'Aprobado' : e.status === 'failed' ? 'Reprobado' : 'Pendiente'}
                              </Badge>
                              <span className="text-[9px] text-muted-foreground uppercase">v{e.versionNumber}</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            onClick={() => handleDeleteEnrollment(e.enrollmentId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="pt-6">
                  <p className="text-[10px] text-muted-foreground italic w-full text-center">
                    Utilice esta sección para corregir asignaciones erróneas.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="pb-3 bg-slate-50/50 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula o puesto..."
                className="pl-8 bg-white"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="bg-white">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="h-12 px-4 text-left font-bold uppercase text-[10px] tracking-wider">Colaborador</th>
                  <th className="h-12 px-4 text-left font-bold uppercase text-[10px] tracking-wider">Estado</th>
                  <th className="h-12 px-4 text-left font-bold uppercase text-[10px] tracking-wider">Depto / Puesto</th>
                  <th className="h-12 px-4 text-left font-bold uppercase text-[10px] tracking-wider">Rol</th>
                  <th className="h-12 px-4 text-right font-bold uppercase text-[10px] tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && users.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="h-16 px-4"><div className="bg-slate-100 h-8 w-full rounded-xl" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground">No se encontraron colaboradores.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className={cn(
                      "hover:bg-slate-50/50 transition-colors group",
                      !u.isActive && "bg-red-50/20 opacity-80"
                    )}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm",
                            u.isActive ? "bg-primary/10 text-primary" : "bg-red-100 text-red-600"
                          )}>
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-none">{u.displayName}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-tighter">ID: {u.cedula}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {u.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1 h-6">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1 h-6">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-slate-700 capitalize">{u.department}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{u.puesto}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.role === 'jefatura' ? 'default' : 'secondary'} className="capitalize h-6">
                          {u.role === 'jefatura' ? <Shield className="w-3 h-3 mr-1" /> : <Briefcase className="w-3 h-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
                          onClick={() => openEditDialog(u)}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

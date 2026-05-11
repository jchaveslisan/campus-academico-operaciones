'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAllUsers, updateUser } from '@/lib/services/userService'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, UserPlus, Filter, 
  Settings2, Mail, Shield, Briefcase,
  UserCheck, UserX, CheckCircle2, XCircle
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  
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
  const [editFormData, setEditFormData] = useState<Partial<UserPublic>>({})

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      toast.error('Error al cargar colaboradores')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const idToken = await user?.getIdToken()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...formData, createdBy: user?.uid }),
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

  const openEditDialog = (u: UserPublic) => {
    setSelectedUser(u)
    setEditFormData({
      displayName: u.displayName,
      email: u.email,
      department: u.department,
      puesto: u.puesto,
      role: u.role,
      isActive: u.isActive
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)
    try {
      await updateUser(selectedUser.uid, editFormData)
      toast.success('Usuario actualizado correctamente')
      setIsEditDialogOpen(false)
      loadUsers()
    } catch (error) {
      toast.error('Error al actualizar usuario')
    } finally {
      setLoading(false)
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateUser}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Editar Colaborador
                </DialogTitle>
                <DialogDescription>
                  Modifica la información de <strong>{selectedUser?.displayName}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre Completo</label>
                  <Input 
                    required 
                    value={editFormData.displayName || ''}
                    onChange={(e) => setEditFormData({...editFormData, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground italic">
                    Cédula: {selectedUser?.cedula} (No editable)
                  </label>
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Puesto / Cargo</label>
                  <Input 
                    required 
                    value={editFormData.puesto || ''}
                    onChange={(e) => setEditFormData({...editFormData, puesto: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado del Usuario</label>
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar'}
                </Button>
              </DialogFooter>
            </form>
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

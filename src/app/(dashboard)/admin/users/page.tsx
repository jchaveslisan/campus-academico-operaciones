'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAllUsers } from '@/lib/services/userService'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Search, UserPlus, Filter, 
  MoreVertical, Mail, Shield, Briefcase 
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

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
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
            <Button className="gap-2">
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
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cédula</label>
                    <Input 
                      required 
                      placeholder="Identificación" 
                      value={formData.cedula}
                      onChange={e => setFormData({...formData, cedula: e.target.value})}
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
                      onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
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
                    onChange={e => setFormData({...formData, email: e.target.value})}
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
                    onChange={e => setFormData({...formData, puesto: e.target.value})}
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
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula o puesto..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Colaborador</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Departamento</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Puesto</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Rol</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="h-16 px-4"><div className="bg-muted h-4 w-full rounded" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-24 text-center text-muted-foreground">No se encontraron colaboradores.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium leading-none">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground mt-1">ID: {u.cedula}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 capitalize">{u.department}</td>
                      <td className="p-4 text-muted-foreground">{u.puesto}</td>
                      <td className="p-4">
                        <Badge variant={u.role === 'jefatura' ? 'default' : 'secondary'} className="capitalize">
                          {u.role === 'jefatura' ? <Shield className="w-3 h-3 mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
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

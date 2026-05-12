export type UserRole = 'jefatura' | 'colaborador'
export type Department = 'produccion' | 'mantenimiento' | 'logistica' | 'calidad' | 'administracion' | 'id'

export interface UserDocument {
  uid: string
  displayName: string
  cedula: string
  email: string
  department: Department
  role: UserRole
  puesto: string
  pinHash: string
  isActive: boolean
  failedPinAttempts: number
  pinLockedUntil: Date | null
  createdAt: Date
  createdBy: string
  lastLoginAt: Date | null
}

export interface UserPublic {
  uid: string
  displayName: string
  cedula: string
  email: string
  department: Department
  role: UserRole
  puesto: string
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
}

export interface CreateUserPayload {
  displayName: string
  cedula: string
  email: string
  department: Department
  role: UserRole
  puesto: string
  pin: string // plain PIN — will be hashed server-side
}

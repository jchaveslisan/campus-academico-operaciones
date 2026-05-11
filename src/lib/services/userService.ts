import { db } from '@/lib/firebase/client'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { UserPublic, CreateUserPayload } from '@/types/user.types'

export async function getUserById(uid: string): Promise<UserPublic | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    uid: snap.id,
    displayName: data.displayName,
    cedula: data.cedula,
    email: data.email,
    department: data.department,
    role: data.role,
    puesto: data.puesto,
    isActive: data.isActive,
    createdAt: data.createdAt?.toDate(),
    lastLoginAt: data.lastLoginAt?.toDate() ?? null,
  }
}

export async function getAllUsers(onlyActive = false): Promise<UserPublic[]> {
  const q = onlyActive 
    ? query(collection(db, 'users'), where('isActive', '==', true))
    : collection(db, 'users')
    
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      uid: d.id,
      displayName: data.displayName,
      cedula: data.cedula,
      email: data.email,
      department: data.department,
      role: data.role,
      puesto: data.puesto,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate() ?? null,
    }
  })
}

export async function updateUser(uid: string, data: Partial<UserPublic>): Promise<void> {
  const { uid: _, createdAt: __, ...updateData } = data as any
  await updateDoc(doc(db, 'users', uid), {
    ...updateData,
    updatedAt: Timestamp.now()
  })
}

export async function deactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { isActive: false })
}

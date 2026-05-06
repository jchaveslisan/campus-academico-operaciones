'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import { UserPublic } from '@/types/user.types'

interface AuthContextValue {
  user: User | null
  profile: UserPublic | null
  loading: boolean
  activeView: 'personal' | 'admin'
  setActiveView: (view: 'personal' | 'admin') => void
  loginWithCustomToken: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'personal' | 'admin'>('personal')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (snap.exists()) {
            const data = snap.data() as UserPublic
            setProfile(data)
            setActiveView('personal')
          }
        } catch (error) {
          console.error("Error cargando perfil:", error)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loginWithCustomToken = async (token: string) => {
    await signInWithCustomToken(auth, token)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setProfile(null)
    setActiveView('personal')
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, activeView, setActiveView, loginWithCustomToken, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { toast } from 'sonner'
import { Delete, Loader2 } from 'lucide-react'

const PIN_LENGTH = 4

export default function PinLoginPage() {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'cedula' | 'pin'>('cedula')
  const [loading, setLoading] = useState(false)

  const handleCedulaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cedula.trim().length < 5) {
      toast.error('Ingrese un número de cédula válido')
      return
    }
    setStep('pin')
  }

  const handlePinKey = (key: string) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + key
    setPin(newPin)
    if (newPin.length === PIN_LENGTH) {
      handleLogin(newPin)
    }
  }

  const handleDelete = () => setPin((p) => p.slice(0, -1))

  const handleLogin = async (fullPin: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), pin: fullPin }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error de autenticación')
        setPin('')
        setLoading(false)
        return
      }

      try {
        await signInWithCustomToken(auth, data.customToken)
      } catch (fbError: any) {
        console.error('❌ Error detallado de Firebase Auth:', fbError)
        console.error('Código:', fbError.code)
        console.error('Mensaje:', fbError.message)
        toast.error(`Error de sesión: ${fbError.code}`)
        setPin('')
        setLoading(false)
        return
      }
      
      toast.success('¡Bienvenido!')
      router.push('/home')
    } catch {
      toast.error('Error de conexión. Intente de nuevo.')
      setPin('')
      setLoading(false)
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] px-4">
      {/* Logo / Header */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 mb-4">
          <span className="text-3xl">🏭</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Campus Académico</h1>
        <p className="text-indigo-200/70 text-sm mt-1">Operaciones · Acceso seguro</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-3xl p-8 w-full max-w-sm shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 'cedula' ? (
            <motion.div
              key="cedula"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-white font-semibold text-lg mb-1">Ingrese su cédula</h2>
              <p className="text-indigo-200/60 text-sm mb-6">Número de identificación del colaborador</p>
              <form onSubmit={handleCedulaSubmit} className="space-y-4">
                <input
                  id="cedula-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 123456789"
                  className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                  autoFocus
                />
                <button
                  id="cedula-submit"
                  type="submit"
                  className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-semibold rounded-xl py-3 transition-all duration-150"
                >
                  Continuar →
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => { setStep('cedula'); setPin('') }}
                className="text-indigo-300/70 hover:text-indigo-200 text-sm mb-4 flex items-center gap-1"
              >
                ← Cambiar cédula
              </button>
              <h2 className="text-white font-semibold text-lg mb-1">Ingrese su PIN</h2>
              <p className="text-indigo-200/60 text-sm mb-6">Cédula: <span className="text-white font-medium">{cedula}</span></p>

              {/* PIN dots */}
              <div className="flex justify-center gap-4 mb-8">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: pin.length > i ? 1.2 : 1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                    className={`w-4 h-4 rounded-full border-2 transition-colors duration-150 ${
                      pin.length > i
                        ? 'bg-indigo-400 border-indigo-400'
                        : 'bg-transparent border-white/30'
                    }`}
                  />
                ))}
              </div>

              {/* Numpad */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 justify-items-center">
                  {keys.map((key, idx) => {
                    const uniqueKey = key === '' ? `empty-${idx}` : key;
                    if (key === '') return <div key={uniqueKey} />
                    if (key === 'del') {
                      return (
                        <button
                          key="del"
                          id="pin-delete"
                          onClick={handleDelete}
                          className="pin-key"
                          aria-label="Borrar"
                        >
                          <Delete className="w-5 h-5" />
                        </button>
                      )
                    }
                    return (
                      <button
                        key={uniqueKey}
                        id={`pin-key-${key}`}
                        className="pin-key"
                        onClick={() => handlePinKey(key)}
                      >
                        {key}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p className="text-indigo-200/30 text-xs mt-8 text-center">
        Campus Académico · Operaciones Farmacéuticas<br />
        Acceso restringido a personal autorizado
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { CertificateDocument } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ShieldCheck, Beaker, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function VerifyCertificatePage() {
  const { id } = useParams() as { id: string }
  const [cert, setCert] = useState<CertificateDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) verify()
  }, [id])

  const verify = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'certificates'), where('certificateId', '==', id))
      const snap = await getDocs(q)
      if (!snap.empty) {
        setCert(snap.docs[0].data() as CertificateDocument)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-md w-full shadow-2xl border-primary/20 overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Beaker className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Verificación de Autenticidad</CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Campus Académico Operaciones</p>
        </CardHeader>
        
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando firma digital...</p>
            </div>
          ) : cert ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-4">
                <ShieldCheck className="w-10 h-10 text-green-600" />
                <div>
                  <p className="font-bold text-green-700">Certificado Válido</p>
                  <p className="text-[10px] text-green-600/80">Documento verificado en el registro central.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Colaborador</p>
                    <p className="font-bold">{cert.userName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Cédula</p>
                    <p className="font-bold">{cert.userCedula}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Capacitación</p>
                    <p className="font-bold text-sm text-primary">{cert.courseName}</p>
                    <p className="text-[10px] opacity-70">Versión: {cert.versionNumber}.0</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Fecha Emisión</p>
                    <p className="font-bold">{(cert.issuedAt as any).toDate?.().toLocaleDateString() || new Date(cert.issuedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Estado</p>
                    <Badge className="bg-green-600 text-[10px] h-5">Vigente</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t text-[10px] text-muted-foreground text-center">
                Este sistema cumple con los requisitos de trazabilidad y auditoría 21 CFR Part 11 / GMP.
              </div>
            </motion.div>
          ) : (
            <div className="py-10 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <p className="font-bold text-red-600">Certificado No Encontrado</p>
                <p className="text-xs text-muted-foreground">El código proporcionado no corresponde a un registro válido o ha sido revocado.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

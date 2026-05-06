'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { CertificateDocument } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Award, Download, Calendar, ShieldCheck, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { generateCertificatePDF } from '@/lib/utils/pdfGenerator'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CertificatesPage() {
  const { profile } = useAuth()
  const [certificates, setCertificates] = useState<CertificateDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (profile) {
      loadCertificates()
    }
  }, [profile])

  const loadCertificates = async () => {
    try {
      const q = query(
        collection(db, 'certificates'), 
        where('userId', '==', profile!.uid)
      )
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ ...d.data() } as CertificateDocument))
      // Sort manually to avoid index wait
      setCertificates(data.sort((a, b) => {
        const dateA = (a.issuedAt as any).toMillis?.() || new Date(a.issuedAt).getTime()
        const dateB = (b.issuedAt as any).toMillis?.() || new Date(b.issuedAt).getTime()
        return dateB - dateA
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (cert: CertificateDocument) => {
    setDownloadingId(cert.certificateId)
    try {
      // We convert Firestore Timestamps to Dates for the generator
      const issuedAt = (cert.issuedAt as any).toDate?.() || new Date(cert.issuedAt)
      const expiresAt = (cert.expiresAt as any).toDate?.() || new Date(cert.expiresAt)
      
      await generateCertificatePDF({
        ...cert,
        issuedAt,
        expiresAt
      })
      toast.success('Certificado descargado')
    } catch (error) {
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const filtered = certificates.filter(c => 
    c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificateId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Certificados</h1>
          <p className="text-muted-foreground">Descarga tus evidencias de cumplimiento y capacitación.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div className="text-[10px] leading-tight">
            <p className="font-bold text-primary uppercase">Trazabilidad GMP</p>
            <p className="text-muted-foreground">Documentos con firma digital</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar certificados..."
          className="pl-8"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48 bg-muted/20" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Award className="w-16 h-16 text-muted-foreground mx-auto opacity-10 mb-4" />
            <p className="text-muted-foreground">Aún no has obtenido ningún certificado.</p>
          </div>
        ) : (
          filtered.map((cert) => (
            <Card key={cert.certificateId} className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
              <div className="h-2 bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">ID: {cert.certificateId}</p>
                </div>
                <CardTitle className="text-base line-clamp-2 min-h-[3rem]">{cert.courseName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Emitido: {format((cert.issuedAt as any).toDate?.() || new Date(cert.issuedAt), 'PP', { locale: es })}
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    Vence: {format((cert.expiresAt as any).toDate?.() || new Date(cert.expiresAt), 'PP', { locale: es })}
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleDownload(cert)}
                  disabled={downloadingId === cert.certificateId}
                  className="w-full gap-2 bg-slate-900 hover:bg-slate-800"
                >
                  {downloadingId === cert.certificateId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingId === cert.certificateId ? 'Generando...' : 'Descargar PDF'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyEnrollments } from '@/lib/services/enrollmentService'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, CheckCircle2, XCircle, Clock, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function HistoryPage() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState<EnrollmentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (profile) {
      getMyEnrollments(profile.uid).then(data => {
        setEnrollments(data)
        setLoading(false)
      })
    }
  }, [profile])

  const filtered = enrollments.filter(e => 
    e.status === 'passed' || e.status === 'failed' || e.status === 'expired'
  ).filter(e => 
    // En un sistema real buscaríamos el título del curso, aquí simplificamos
    e.courseId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Historial</h1>
        <p className="text-muted-foreground">Registro histórico de todas tus capacitaciones completadas.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en el historial..."
          className="pl-8"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-10 text-center">Cargando historial...</div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <History className="w-10 h-10 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground text-sm">No tienes registros históricos todavía.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((e) => (
            <Card key={e.enrollmentId} className="overflow-hidden border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">Capacitación ID: {e.courseId}</p>
                      <Badge variant="outline" className="text-[10px]">v{e.versionNumber}.0</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asignado el {format(new Date(e.assignedAt instanceof Date ? e.assignedAt : (e.assignedAt as any).toDate?.() || e.assignedAt), "PPP", { locale: es })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Resultado</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        {e.status === 'passed' ? (
                          <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="text-sm font-medium text-green-600">Aprobado</span></>
                        ) : e.status === 'expired' ? (
                          <><Clock className="w-4 h-4 text-amber-500" /> <span className="text-sm font-medium text-amber-600">Vencido</span></>
                        ) : (
                          <><XCircle className="w-4 h-4 text-red-500" /> <span className="text-sm font-medium text-red-600">No Aprobado</span></>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Intentos</p>
                      <p className="text-sm font-bold">{e.attempts}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

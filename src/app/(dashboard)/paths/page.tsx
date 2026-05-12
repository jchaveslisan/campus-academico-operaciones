'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPathAssignments } from '@/lib/services/learningPathService'
import { getMyEnrollments } from '@/lib/services/enrollmentService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ClipboardList, CheckCircle2, Clock, 
  ChevronRight, ArrowRight, GraduationCap,
  Loader2, PlayCircle, BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function MyPathsPage() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  const loadData = async () => {
    setLoading(true)
    try {
      const [aData, eData] = await Promise.all([
        getPathAssignments(profile!.uid),
        getMyEnrollments(profile!.uid)
      ])
      setAssignments(aData)
      setEnrollments(eData)
    } catch (error) {
      console.error('Error loading paths:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Cargando tus rutas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Mis Rutas de Aprendizaje</h1>
        <p className="text-muted-foreground text-lg">Sigue tu progreso en los currículos especializados para tu puesto.</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed border-2 py-20 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
              <GraduationCap className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-xl">Sin rutas asignadas</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Cuando tu líder te asigne una ruta de aprendizaje (como Inducción o Certificación), aparecerá aquí para que sigas tu avance.</p>
            </div>
            <Link href="/home">
              <Button className="mt-4 gap-2 h-12 px-8">
                <BookOpen className="w-4 h-4" />
                Ir a mis cursos individuales
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {assignments.map((path) => {
            // Find progress based on actual enrollments
            // Note: In a real app we'd need the path's course list here.
            // For now, let's assume we have the path info in the assignment or fetch it.
            return (
              <Card key={path.id} className="overflow-hidden shadow-2xl border-none shadow-slate-200/60 rounded-[2.5rem]">
                <CardHeader className="p-8 pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black text-slate-800">{path.pathTitle}</h2>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none">Asignada el {path.assignedAt.toLocaleDateString()}</Badge>
                          <Badge variant="outline" className="border-primary/20 text-primary">ID: {path.id.slice(0, 8)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tu Progreso</p>
                       <p className="text-5xl font-black text-primary">{path.progress || 0}%</p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Progress value={path.progress || 0} className="h-4 rounded-full bg-slate-100" />
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-6">
                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5 text-primary" />
                      Cursos Requeridos
                    </h3>
                    <p className="text-xs text-muted-foreground italic -mt-4">Revise y complete cada curso de esta lista para finalizar su ruta de aprendizaje.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* This would normally map over the path's courses. 
                           Since assignment doesn't store course titles, we show a generic link to the home page for now 
                           or inform the user they can find them in 'Mis Cursos' */}
                       <div className="col-span-full p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center text-center gap-4">
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                          <div className="space-y-1">
                            <p className="font-bold text-slate-800">Visualización de Cursos en Ruta</p>
                            <p className="text-sm text-muted-foreground max-w-md">Todos los cursos incluidos en esta ruta se encuentran habilitados en tu sección principal de <strong>"Mis Cursos"</strong>. Búscalos para completarlos y ver cómo sube tu progreso aquí.</p>
                          </div>
                          <Link href="/home">
                            <Button variant="outline" className="rounded-xl h-12 px-8">Ir a completar cursos</Button>
                          </Link>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

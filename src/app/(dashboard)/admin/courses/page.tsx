'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { CourseDocument } from '@/types/course.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, BookMarked, Video, FileText, 
  Settings, History, ChevronRight, Layers,
  ExternalLink, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    try {
      const data = await getActiveCourses()
      setCourses(data)
    } catch (error) {
      toast.error('Error al cargar cursos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Cursos</h1>
          <p className="text-muted-foreground">Gestiona el contenido académico y sus versiones.</p>
        </div>
        
        <Link href="/admin/courses/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Curso
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-xl" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted w-2/3 rounded" />
                <div className="h-3 bg-muted w-full rounded" />
              </CardContent>
            </Card>
          ))
        ) : courses.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
            <BookMarked className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground font-medium">No hay cursos creados aún.</p>
            <Link href="/admin/courses/new">
              <Button variant="link" className="mt-2 text-primary">Comienza creando tu primer curso</Button>
            </Link>
          </div>
        ) : (
          courses.map((course) => (
            <Card key={course.courseId} className="overflow-hidden border-border/50 hover:shadow-lg transition-all group">
              <div className="h-3 bg-primary" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    v{course.currentVersion}
                  </Badge>
                  <div className="flex gap-1">
                    {course.department.map(dept => (
                      <Badge key={dept} variant="secondary" className="text-[10px] capitalize">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    Video SOP
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Quiz (5)
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {course.validityDays}d vigencia
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Link href={`/admin/courses/${course.courseId}`} className="flex-1">
                    <Button variant="outline" className="w-full text-xs gap-1.5 h-9">
                      <Settings className="w-3.5 h-3.5" />
                      Gestionar
                    </Button>
                  </Link>
                  <Link href={`/admin/courses/${course.courseId}`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9" title="Historial de Versiones">
                      <History className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/admin/courses/${course.courseId}/new-version`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10" title="Nueva Versión">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

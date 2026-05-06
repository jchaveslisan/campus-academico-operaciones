'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { CourseDocument } from '@/types/course.types'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  FileText, Search, UserCheck, 
  BookMarked, Calendar, Printer,
  Clock, FileType
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Word Generation Libraries
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'

export default function AttendanceGeneratorPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<CourseDocument[]>([])
  const [users, setUsers] = useState<UserPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [instructor, setInstructor] = useState('')
  const [trainingType, setTrainingType] = useState('Interna')
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cData, uData] = await Promise.all([
        getActiveCourses(),
        getAllUsers()
      ])
      setCourses(cData)
      setUsers(uData)
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const generateWord = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0 || !instructor || !duration) {
      toast.error('Complete todos los campos')
      return
    }

    setGenerating(true)
    try {
      const course = courses.find(c => c.courseId === selectedCourseId)
      const attendees = users
        .filter(u => selectedUserIds.includes(u.uid))
        .map(u => ({ nombre: u.displayName, puesto: u.puesto }))

      // 1. Load the Word template from public folder
      const response = await fetch('/machote-asistencia.docx')
      const content = await response.arrayBuffer()
      
      const zip = new PizZip(content)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      })

      // 2. Set the data for placeholders
      doc.setData({
        tema: course?.title || '',
        instructor: instructor,
        tipo_i: trainingType === 'Interna' ? 'X' : '',
        tipo_e: trainingType === 'Externa' ? 'X' : '',
        fecha: trainingDate,
        duracion: duration,
        asistentes: attendees // This will loop if the table row has {#asistentes}...{/asistentes}
      })

      // 3. Render the document
      try {
        doc.render()
      } catch (error) {
        console.error('Error rendering docx:', error)
        toast.error('Error al procesar las etiquetas del Word. Verifique que existan en el archivo.')
        setGenerating(false)
        return
      }

      // 4. Generate and save
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      
      saveAs(out, `F-RH-02_${course?.title}_${trainingDate}.docx`)
      toast.success('Documento Word generado con éxito')
    } catch (error) {
      console.error(error)
      toast.error('No se pudo cargar el archivo machote-asistencia.docx')
    } finally {
      setGenerating(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.cedula.includes(userSearch) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileType className="w-8 h-8 text-primary" />
            Asistente de Firmas (Word)
          </h1>
          <p className="text-muted-foreground">Genera el machote oficial basado en plantilla de Word (.docx).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" />
                Datos de la Sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tema</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger><SelectValue placeholder="Seleccione el curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Instructor</label>
                <Input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Nombre completo" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Capacitación Interna</SelectItem>
                    <SelectItem value="Externa">Capacitación Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                  <Input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Duración</label>
                  <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ej: 0.5 Horas" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={generateWord} 
            disabled={generating || loading || selectedUserIds.length === 0}
            className="w-full h-16 gap-2 text-lg font-bold shadow-xl shadow-primary/20 bg-slate-900"
          >
            {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Printer className="w-6 h-6" />}
            GENERAR WORD
          </Button>
          
          <p className="text-[10px] text-muted-foreground bg-slate-50 p-3 rounded-lg border">
            <strong>Nota:</strong> El documento generado tendrá los datos alineados perfectamente según el formato que definas en Word.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-lg border-primary/10 overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold">Asistentes ({selectedUserIds.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Buscar..." 
                  className="h-8 text-xs w-40 bg-white" 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.uid))}>Todos</Button>
                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-red-500" onClick={() => setSelectedUserIds([])}>Limpiar</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y border-b">
                {filteredUsers.map(u => (
                  <div 
                    key={u.uid}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer",
                      selectedUserIds.includes(u.uid) && "bg-primary/5"
                    )}
                    onClick={() => toggleUser(u.uid)}
                  >
                    <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{u.displayName}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{u.puesto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

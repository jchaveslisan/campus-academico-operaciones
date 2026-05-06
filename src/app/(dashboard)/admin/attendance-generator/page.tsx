'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getActiveCourses } from '@/lib/services/courseService'
import { getAllUsers } from '@/lib/services/userService'
import { CourseDocument } from '@/types/course.types'
import { UserPublic } from '@/types/user.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  FileText, Search, User, 
  BookMarked, Calendar, Printer,
  Users, Check, X, Clock, UserCheck
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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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
  const [trainingType, setTrainingType] = useState('Capacitación Técnica')
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

  const generatePDF = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0 || !instructor || !duration) {
      toast.error('Complete todos los campos y seleccione al menos un asistente')
      return
    }

    setGenerating(true)
    try {
      const course = courses.find(c => c.courseId === selectedCourseId)
      const attendees = users.filter(u => selectedUserIds.includes(u.uid))

      // Load the template
      const existingPdfBytes = await fetch('/F-RH-02 Control de actividades de capacitación (V.01).pdf').then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()

      // Set Font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Helper to draw text (coordinates might need adjustment based on the actual PDF)
      const drawText = (text: string, x: number, y: number, size = 10, isBold = false) => {
        firstPage.drawText(text, {
          x,
          y: height - y,
          size,
          font: isBold ? boldFont : font,
          color: rgb(0, 0, 0),
        })
      }

      // 1. Fill header info (Ajustar coordenadas segn el PDF real)
      drawText(course?.title || '', 150, 115, 11, true)
      drawText(instructor, 150, 135)
      drawText(trainingType, 150, 155)
      drawText(trainingDate, 450, 135)
      drawText(duration, 450, 155)

      // 2. Fill attendees table
      let yPos = 240 // Starting Y for the table rows
      attendees.forEach((user, index) => {
        if (index < 20) { // Limit to fit on one page for now
          drawText((index + 1).toString(), 45, yPos)
          drawText(user.displayName, 80, yPos, 9)
          drawText(user.puesto, 320, yPos, 8)
          // The signature column is left empty for manual signing
          yPos += 18 // Row height
        }
      })

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save()

      // Trigger download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Control_Capacitacion_${course?.title}_${trainingDate}.pdf`
      link.click()
      
      toast.success('Documento generado con éxito')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF. Verifique que el archivo machote esté disponible.')
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
            <FileText className="w-8 h-8 text-primary" />
            Asistente de Firmas (F-RH-02)
          </h1>
          <p className="text-muted-foreground">Genera el machote de control de capacitación para firmas físicas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" />
                1. Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tema de Capacitación</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Instructor</label>
                <Input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Nombre del facilitador" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Capacitación</label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Capacitación Técnica">Capacitación Técnica</SelectItem>
                    <SelectItem value="Inducción">Inducción</SelectItem>
                    <SelectItem value="Salud y Seguridad">Salud y Seguridad</SelectItem>
                    <SelectItem value="Calidad / GMP">Calidad / GMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                  <Input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Duración</label>
                  <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ej: 2 horas" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={generatePDF} 
            disabled={generating || loading || selectedUserIds.length === 0}
            className="w-full h-16 gap-2 text-lg font-bold shadow-xl shadow-primary/20 bg-slate-900"
          >
            {generating ? (
              <Clock className="w-5 h-5 animate-spin" />
            ) : (
              <Printer className="w-6 h-6" />
            )}
            GENERAR DOCUMENTO
          </Button>
        </div>

        {/* Step 2: Attendees Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-lg border-primary/10 overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                2. Lista de Asistentes ({selectedUserIds.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Buscar..." 
                  className="h-8 text-xs w-40" 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px]"
                  onClick={() => setSelectedUserIds(filteredUsers.map(u => u.uid))}
                >
                  Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-[10px] text-red-500"
                  onClick={() => setSelectedUserIds([])}
                >
                  Limpiar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y border-b">
                {filteredUsers.map(u => (
                  <div 
                    key={u.uid}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors",
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

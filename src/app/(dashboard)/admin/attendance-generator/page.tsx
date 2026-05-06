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
  Clock, Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
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
  const [trainingType, setTrainingType] = useState('Interna')
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')

  // CALIBRATION STATE (To move things manually)
  const [coords, setCoords] = useState({
    headerX: 110,
    headerY: 178,
    typeInternaX: 387,
    typeExternaX: 460,
    tableX: 55,
    tableY: 282,
    puestoX: 395
  })

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

  const adjust = (key: keyof typeof coords, amount: number) => {
    setCoords(prev => ({ ...prev, [key]: prev[key] + amount }))
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
      toast.error('Complete los campos obligatorios')
      return
    }

    setGenerating(true)
    try {
      const course = courses.find(c => c.courseId === selectedCourseId)
      const attendees = users.filter(u => selectedUserIds.includes(u.uid))

      const existingPdfBytes = await fetch(`/machote-asistencia.pdf?t=${Date.now()}`).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { height } = firstPage.getSize()

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const drawText = (text: string, x: number, y: number, size = 9, isBold = false) => {
        if (!text) return
        firstPage.drawText(text, {
          x,
          y: height - y,
          size,
          font: isBold ? boldFont : font,
          color: rgb(0, 0, 0),
        })
      }

      // 1. HEADER
      drawText(course?.title || '', coords.headerX, coords.headerY, 10, true)
      drawText(instructor, coords.headerX, coords.headerY + 25, 9)
      drawText(trainingDate, coords.headerX, coords.headerY + 51, 9)
      drawText(duration, coords.headerX + 220, coords.headerY + 51, 9)
      
      // TIPO X
      if (trainingType === 'Interna') {
        drawText('X', coords.typeInternaX, coords.headerY + 20, 12, true)
      } else {
        drawText('X', coords.typeExternaX, coords.headerY + 20, 12, true)
      }

      // 2. TABLE
      let yPos = coords.tableY
      attendees.forEach((user, index) => {
        if (index < 25) {
          drawText(user.displayName, coords.tableX, yPos, 8)
          drawText(user.puesto, coords.puestoX, yPos, 7)
          yPos += 19.8
        }
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `F-RH-02_CALIBRADO.pdf`
      link.click()
      
      toast.success('PDF generado. ¡Verifica si quedó alineado!')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF. Asegúrese de que el machote-asistencia.pdf esté en public/')
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
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Asistente de Firmas (PDF Calibrado)</h1>
          <p className="text-muted-foreground">Usa las flechas para ajustar la posición del texto si no encaja.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CONFIG COLUMN */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="py-4 bg-slate-50 border-b">
              <CardTitle className="text-sm uppercase tracking-wider font-bold">1. Datos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger><SelectValue placeholder="Curso" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Instructor" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
                <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duración" />
              </div>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interna">Interna</SelectItem>
                  <SelectItem value="Externa">Externa</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* CALIBRATION CONTROLS */}
          <Card className="shadow-lg border-amber-200 bg-amber-50/30">
            <CardHeader className="py-3 border-b border-amber-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-amber-800 flex items-center gap-2">
                <Move className="w-4 h-4" /> PANEL DE CALIBRACIÓN
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[9px]">AJUSTE MANUAL</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {/* Header Adjust */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-900">POSICIÓN ENCABEZADO (X, Y)</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => adjust('headerX', -5)}><ChevronLeft className="w-4 h-4"/></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => adjust('headerX', 5)}><ChevronRight className="w-4 h-4"/></Button>
                  </div>
                  <div className="flex-1 flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => adjust('headerY', -5)}><ChevronUp className="w-4 h-4"/></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={() => adjust('headerY', 5)}><ChevronDown className="w-4 h-4"/></Button>
                  </div>
                </div>
              </div>

              {/* Table Adjust */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-900">INICIO DE TABLA (Y)</p>
                <div className="flex gap-1">
                  <Button variant="outline" className="flex-1 bg-white" onClick={() => adjust('tableY', -5)}>Subir Tabla</Button>
                  <Button variant="outline" className="flex-1 bg-white" onClick={() => adjust('tableY', 5)}>Bajar Tabla</Button>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1">
                <p className="text-[9px] font-mono">X Header: {coords.headerX} | Y Header: {coords.headerY}</p>
                <p className="text-[9px] font-mono">Y Tabla: {coords.tableY}</p>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={generatePDF} 
            disabled={generating || loading}
            className="w-full h-16 text-lg font-bold shadow-xl bg-slate-900"
          >
            {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Printer className="w-6 h-6 mr-2" />}
            GENERAR Y PROBAR
          </Button>
        </div>

        {/* SELECTION COLUMN */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="shadow-lg h-full flex flex-col">
            <CardHeader className="py-4 bg-slate-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Asistentes ({selectedUserIds.length})</CardTitle>
              <Input 
                placeholder="Buscar..." 
                className="h-8 text-xs w-48 bg-white" 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer", selectedUserIds.includes(u.uid) && "bg-primary/5")} onClick={() => toggleUser(u.uid)}>
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

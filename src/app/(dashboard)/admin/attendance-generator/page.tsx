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
  Clock, Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  GripVertical, Settings2
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

  // ULTRA CALIBRATION STATE
  const [coords, setCoords] = useState({
    temaX: 120,
    temaY: 182,
    instructorX: 120,
    instructorY: 208,
    fechaX: 120,
    fechaY: 233,
    duracionX: 340,
    duracionY: 233,
    typeInternaX: 387,
    typeExternaX: 460,
    typeY: 203,
    tableX: 55,
    tableY: 286,
    puestoX: 395,
    rowHeight: 19.8
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
    setCoords(prev => ({ ...prev, [key]: Number((prev[key] + amount).toFixed(1)) }))
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

      // --- LLENADO CON ULTRA-CALIBRACION ---
      drawText(course?.title || '', coords.temaX, coords.temaY, 10, true)
      drawText(instructor, coords.instructorX, coords.instructorY, 9)
      drawText(trainingDate, coords.fechaX, coords.fechaY, 9)
      drawText(duration, coords.duracionX, coords.duracionY, 9)
      
      if (trainingType === 'Interna') {
        drawText('X', coords.typeInternaX, coords.typeY, 12, true)
      } else {
        drawText('X', coords.typeExternaX, coords.typeY, 12, true)
      }

      let yPos = coords.tableY
      attendees.forEach((user, index) => {
        if (index < 25) {
          drawText(user.displayName, coords.tableX, yPos, 8)
          drawText(user.puesto, coords.puestoX, yPos, 7)
          yPos += coords.rowHeight
        }
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `F-RH-02_CALIBRADO.pdf`
      link.click()
      
      toast.success('PDF generado con éxito')
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el PDF')
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
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Asistente F-RH-02</h1>
          <p className="text-muted-foreground font-medium">Control milimétrico de posicionamiento de datos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4">
        {/* INPUTS */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-lg border-border/60">
            <CardHeader className="py-3 bg-slate-50 border-b">
              <CardTitle className="text-xs uppercase tracking-widest font-black">1. Información</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Curso" /></SelectTrigger>
                <SelectContent>{courses.map(c => <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-9" value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Instructor" />
              <div className="grid grid-cols-2 gap-2">
                <Input className="h-9 px-2" type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
                <Input className="h-9" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duración" />
              </div>
              <Select value={trainingType} onValueChange={setTrainingType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interna">Interna</SelectItem>
                  <SelectItem value="Externa">Externa</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button onClick={generatePDF} disabled={generating || loading} className="w-full h-14 text-lg font-bold shadow-xl bg-slate-900 hover:bg-slate-800">
            {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
            IMPRIMIR PDF
          </Button>
        </div>

        {/* ULTRA CALIBRATION PANEL */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-xl border-amber-200 bg-amber-50/20 overflow-hidden">
            <CardHeader className="py-2.5 border-b border-amber-100 bg-amber-100/30 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black text-amber-900 flex items-center gap-2 tracking-widest uppercase">
                <Settings2 className="w-4 h-4" /> Calibración Individual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
              
              {/* TEMA */}
              <div className="space-y-1.5 pb-3 border-b border-amber-200/50">
                <p className="text-[9px] font-black text-amber-800 uppercase flex justify-between">
                  TEMA (X, Y) <span className="font-mono">{coords.temaX}, {coords.temaY}</span>
                </p>
                <div className="flex gap-1 justify-center bg-white p-1 rounded-lg border border-amber-200">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('temaX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('temaX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                  <div className="w-px bg-slate-100 mx-1" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('temaY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('temaY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                </div>
              </div>

              {/* INSTRUCTOR */}
              <div className="space-y-1.5 pb-3 border-b border-amber-200/50">
                <p className="text-[9px] font-black text-amber-800 uppercase flex justify-between">
                  INSTRUCTOR (X, Y) <span className="font-mono">{coords.instructorX}, {coords.instructorY}</span>
                </p>
                <div className="flex gap-1 justify-center bg-white p-1 rounded-lg border border-amber-200">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('instructorX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('instructorX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                  <div className="w-px bg-slate-100 mx-1" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('instructorY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('instructorY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                </div>
              </div>

              {/* TIPO (X, Y) */}
              <div className="space-y-1.5 pb-3 border-b border-amber-200/50">
                <p className="text-[9px] font-black text-amber-800 uppercase flex justify-between">
                  INTERNA (X) | EXTERNA (X) | Y <span className="font-mono">{coords.typeY}</span>
                </p>
                <div className="flex gap-1 justify-between bg-white p-1 rounded-lg border border-amber-200">
                  <div className="flex gap-0.5">
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeInternaX', -1)}>I-</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeInternaX', 1)}>I+</Button>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeExternaX', -1)}>E-</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeExternaX', 1)}>E+</Button>
                  </div>
                  <div className="flex gap-0.5">
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeY', -1)}>Y-</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[8px]" onClick={() => adjust('typeY', 1)}>Y+</Button>
                  </div>
                </div>
              </div>

              {/* FECHA Y DURACION */}
              <div className="space-y-1.5 pb-3 border-b border-amber-200/50">
                <p className="text-[9px] font-black text-amber-800 uppercase flex justify-between">
                  FECHA (X, Y) | DURACIÓN (X) <span className="font-mono">{coords.fechaY}</span>
                </p>
                <div className="flex flex-col gap-2 bg-white p-2 rounded-lg border border-amber-200">
                  <div className="flex justify-between gap-1">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('fechaX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('fechaX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('duracionX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('duracionX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('fechaY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('fechaY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REPETIR CONTROLES DE TABLA SI ES NECESARIO */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-amber-800 uppercase flex justify-between">
                  TABLA (X, Y) | FILAS | PUESTO <span className="font-mono">{coords.tableY}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-amber-200">
                  <Button variant="outline" size="sm" className="text-[8px] h-7" onClick={() => adjust('tableY', -1)}>Subir Tabla</Button>
                  <Button variant="outline" size="sm" className="text-[8px] h-7" onClick={() => adjust('tableY', 1)}>Bajar Tabla</Button>
                  <Button variant="outline" size="sm" className="text-[8px] h-7" onClick={() => adjust('rowHeight', -0.1)}>Menos Espacio</Button>
                  <Button variant="outline" size="sm" className="text-[8px] h-7" onClick={() => adjust('rowHeight', 0.1)}>Más Espacio</Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* ASISTENTES */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-xl border-border/60 h-full flex flex-col overflow-hidden">
            <CardHeader className="py-3 bg-slate-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Asistentes ({selectedUserIds.length})</CardTitle>
              <Input 
                placeholder="Filtrar..." 
                className="h-8 text-xs w-32 bg-white" 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
              <div className="grid grid-cols-1 divide-y">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors", selectedUserIds.includes(u.uid) && "bg-primary/5")} onClick={() => toggleUser(u.uid)}>
                    <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate text-slate-800">{u.displayName}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">{u.puesto}</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] uppercase">{u.department}</Badge>
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

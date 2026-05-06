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
  GripVertical
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
      toast.error('Error al cargar el machote PDF')
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Control de Capacitación</h1>
          <p className="text-muted-foreground font-medium">Asistente de generación de registros F-RH-02</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4">
        {/* CONFIG COLUMN */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="py-3 bg-slate-50 border-b">
              <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-600">Sesión</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tema</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Curso" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Instructor</label>
                <Input className="h-9" value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="Nombre" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Fecha</label>
                  <Input className="h-9 px-2" type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Duración</label>
                  <Input className="h-9" value={duration} onChange={e => setDuration(e.target.value)} placeholder="0.5h" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Interna</SelectItem>
                    <SelectItem value="Externa">Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={generatePDF} 
            disabled={generating || loading}
            className="w-full h-14 text-lg font-bold shadow-xl bg-slate-900 hover:bg-slate-800 transition-all"
          >
            {generating ? <Clock className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
            IMPRIMIR
          </Button>
        </div>

        {/* CALIBRATION COLUMN */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-xl border-amber-200 bg-amber-50/20 overflow-hidden">
            <CardHeader className="py-3 border-b border-amber-100 bg-amber-100/30 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black text-amber-900 flex items-center gap-2 tracking-widest">
                <Move className="w-4 h-4" /> CALIBRACIÓN
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[9px] border-amber-200">MILLIMETRIC</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Header Adjust */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black text-amber-800 uppercase">Encabezado (X, Y)</p>
                  <span className="text-[9px] font-mono opacity-60">{coords.headerX}, {coords.headerY}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex bg-white rounded-md border border-amber-200 p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('headerX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('headerX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                  </div>
                  <div className="flex bg-white rounded-md border border-amber-200 p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('headerY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('headerY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                  </div>
                </div>
              </div>

              {/* Table Position */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black text-amber-800 uppercase">Posición Tabla (X, Y)</p>
                  <span className="text-[9px] font-mono opacity-60">{coords.tableX}, {coords.tableY}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex bg-white rounded-md border border-amber-200 p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('tableX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('tableX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                  </div>
                  <div className="flex bg-white rounded-md border border-amber-200 p-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('tableY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust('tableY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                  </div>
                </div>
              </div>

              {/* Row Height & Puesto Column */}
              <div className="space-y-4 pt-2 border-t border-amber-200/50">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <p className="text-[9px] font-black text-amber-800 uppercase">Espaciado Filas</p>
                    <span className="text-[9px] font-mono">{coords.rowHeight}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] bg-white" onClick={() => adjust('rowHeight', -0.1)}>-</Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] bg-white" onClick={() => adjust('rowHeight', 0.1)}>+</Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <p className="text-[9px] font-black text-amber-800 uppercase">Columna Puesto (X)</p>
                    <span className="text-[9px] font-mono">{coords.puestoX}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] bg-white" onClick={() => adjust('puestoX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px] bg-white" onClick={() => adjust('puestoX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SELECTION COLUMN */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="shadow-xl border-border/60 h-full flex flex-col overflow-hidden">
            <CardHeader className="py-3 bg-slate-50 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-600 tracking-widest">Asistentes ({selectedUserIds.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Filtrar..." 
                  className="h-8 text-xs w-32 bg-white" 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-primary" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.uid))}>Todos</Button>
                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-red-500" onClick={() => setSelectedUserIds([])}>Limpiar</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors", selectedUserIds.includes(u.uid) && "bg-primary/5")} onClick={() => toggleUser(u.uid)}>
                    <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate text-slate-800">{u.displayName}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">{u.puesto}</p>
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

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
  Settings2, Copy, Check
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
  const [copied, setCopied] = useState(false)
  const [showCalibration, setShowCalibration] = useState(false)
  
  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [instructor, setInstructor] = useState('')
  const [trainingType, setTrainingType] = useState('Interna')
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('')

  // TOTAL CALIBRATION STATE (Configuración Maestra)
  const [coords, setCoords] = useState({
    temaX: 80, temaY: 165,
    instructorX: 115, instructorY: 185,
    fechaX: 105, fechaY: 210,
    duracionX: 370, duracionY: 210,
    typeInternaX: 382, typeExternaX: 453, typeY: 185,
    tableX: 55, tableY: 280,
    puestoX: 410, rowHeight: 23.5
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

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(coords, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Configuración copiada')
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
      const PAGE_LIMIT = 18

      const response = await fetch(`/machote-asistencia.pdf?t=${Date.now()}`)
      if (!response.ok) throw new Error('Machote no encontrado')
      const existingPdfBytes = await response.arrayBuffer()
      
      const pdfDoc = await PDFDocument.create()
      const templateDoc = await PDFDocument.load(existingPdfBytes)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      
      const formattedDate = trainingDate.split('-').reverse().join('/')
      
      // Calculate how many pages we need
      const totalPages = Math.ceil(attendees.length / PAGE_LIMIT)
      
      // For each chunk of 18 people
      for (let i = 0; i < totalPages; i++) {
        const [templatePage] = await pdfDoc.copyPages(templateDoc, [0])
        const currentPage = pdfDoc.addPage(templatePage)

        const { height } = currentPage.getSize()
        const drawText = (text: string, x: number, y: number, size = 9, isBold = false) => {
          if (!text) return
          currentPage.drawText(text, {
            x,
            y: height - y,
            size,
            font: isBold ? boldFont : font,
            color: rgb(0, 0, 0),
          })
        }

        // Draw Headers on every page
        drawText(course?.title || '', coords.temaX, coords.temaY, 10, true)
        drawText(instructor, coords.instructorX, coords.instructorY, 9)
        drawText(formattedDate, coords.fechaX, coords.fechaY, 9)
        drawText(duration, coords.duracionX, coords.duracionY, 9)
        
        if (trainingType === 'Interna') {
          drawText('X', coords.typeInternaX, coords.typeY, 12, true)
        } else {
          drawText('X', coords.typeExternaX, coords.typeY, 12, true)
        }

        // Draw people for this specific page
        const start = i * PAGE_LIMIT
        const end = start + PAGE_LIMIT
        const pageAttendees = attendees.slice(start, end)

        let yPos = coords.tableY
        pageAttendees.forEach((user) => {
          drawText(user.displayName, coords.tableX, yPos, 8)
          drawText(user.puesto, coords.puestoX, yPos, 7)
          yPos += coords.rowHeight
        })
      }

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `F-RH-02_${course?.title.replace(/\s+/g, '_')}.pdf`
      link.click()
      
      toast.success(`PDF generado con ${totalPages} página(s)`)
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

  const ControlGroup = ({ title, xKey, yKey, xVal, yVal }: any) => (
    <div className="space-y-2 pb-3 border-b border-amber-200/50">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-black text-amber-900 uppercase">{title}</p>
        <Badge variant="outline" className="text-[9px] font-mono bg-white">X:{xVal} Y:{yVal}</Badge>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 flex bg-white rounded-lg border border-amber-200 p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(xKey, -1)}><ChevronLeft className="w-3 h-3"/></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(xKey, 1)}><ChevronRight className="w-3 h-3"/></Button>
        </div>
        <div className="flex-1 flex bg-white rounded-lg border border-amber-200 p-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(yKey, -1)}><ChevronUp className="w-3 h-3"/></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(yKey, 1)}><ChevronDown className="w-3 h-3"/></Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 p-4">
      <div className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Asistente F-RH-02</h1>
          <p className="text-muted-foreground text-sm">Generación de registros oficiales con calibración.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCalibration(!showCalibration)} variant="outline" className="gap-2">
            <Settings2 className="w-4 h-4" />
            {showCalibration ? 'Ocultar Panel' : 'Ajustar Posiciones'}
          </Button>
          {showCalibration && (
            <Button onClick={copyConfig} variant="ghost" size="icon" className="text-slate-400">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUTS PANEL */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="shadow-lg">
            <CardHeader className="py-3 bg-slate-50 border-b">
              <CardTitle className="text-xs uppercase font-black">1. Datos</CardTitle>
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
              <Button onClick={generatePDF} disabled={generating || loading} className="w-full h-12 font-bold bg-slate-900 text-white hover:bg-slate-800">
                <Printer className="w-4 h-4 mr-2" /> {generating ? 'Generando...' : 'IMPRIMIR PDF'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CALIBRATION PANEL (Condicional) */}
        {showCalibration && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-xl border-amber-200 bg-amber-50/20">
              <CardHeader className="py-2.5 bg-amber-100/30 flex items-center justify-between border-b border-amber-200">
                <CardTitle className="text-[10px] font-black text-amber-900 tracking-widest uppercase">Calibración Detallada</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <ControlGroup title="Tema" xKey="temaX" yKey="temaY" xVal={coords.temaX} yVal={coords.temaY} />
                <ControlGroup title="Instructor" xKey="instructorX" yKey="instructorY" xVal={coords.instructorX} yVal={coords.instructorY} />
                <ControlGroup title="Fecha" xKey="fechaX" yKey="fechaY" xVal={coords.fechaX} yVal={coords.fechaY} />
                <ControlGroup title="Duración" xKey="duracionX" yKey="duracionY" xVal={coords.duracionX} yVal={coords.duracionY} />
                
                <div className="space-y-2 pb-4 border-b border-amber-200/50">
                  <p className="text-[10px] font-black text-amber-900 uppercase">Marcas de Tipo</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-1 rounded-lg border border-amber-200 flex justify-between items-center">
                      <span className="text-[8px] font-bold ml-2">INT: {coords.typeInternaX}</span>
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeInternaX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeInternaX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                      </div>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-amber-200 flex justify-between items-center">
                      <span className="text-[8px] font-bold ml-2">EXT: {coords.typeExternaX}</span>
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeExternaX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeExternaX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-amber-200 flex justify-between items-center">
                    <span className="text-[8px] font-bold ml-2">ALTURA (Y): {coords.typeY}</span>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeY', -1)}><ChevronUp className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('typeY', 1)}><ChevronDown className="w-3 h-3"/></Button>
                    </div>
                  </div>
                </div>

                <ControlGroup title="Tabla General" xKey="tableX" yKey="tableY" xVal={coords.tableX} yVal={coords.tableY} />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white p-1 rounded-lg border border-amber-200 flex justify-between items-center">
                    <span className="text-[8px] font-bold ml-2">FILAS: {coords.rowHeight}</span>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('rowHeight', -0.1)}><ChevronUp className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('rowHeight', 0.1)}><ChevronDown className="w-3 h-3"/></Button>
                    </div>
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-amber-200 flex justify-between items-center">
                    <span className="text-[8px] font-bold ml-2">PUESTO X: {coords.puestoX}</span>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('puestoX', -1)}><ChevronLeft className="w-3 h-3"/></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => adjust('puestoX', 1)}><ChevronRight className="w-3 h-3"/></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LIST PANEL */}
        <div className={cn("transition-all duration-300", showCalibration ? "lg:col-span-5" : "lg:col-span-9")}>
          <Card className="shadow-xl h-full flex flex-col overflow-hidden">
            <CardHeader className="py-3 bg-slate-50 border-b flex items-center justify-between">
              <CardTitle className="text-xs font-black uppercase">Asistentes ({selectedUserIds.length})</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Filtrar..." className="h-8 text-xs w-32 bg-white" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                <Button variant="ghost" size="sm" className="h-8 text-[10px]" onClick={() => setSelectedUserIds(filteredUsers.map(u => u.uid))}>Todos</Button>
                <Button variant="ghost" size="sm" className="h-8 text-[10px] text-red-500" onClick={() => setSelectedUserIds([])}>Limpiar</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[70vh]">
              <div className="divide-y">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer", selectedUserIds.includes(u.uid) && "bg-primary/5")} onClick={() => toggleUser(u.uid)}>
                    <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800">{u.displayName}</p>
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

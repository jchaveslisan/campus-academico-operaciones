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
  FileText, Search, UserCheck, 
  BookMarked, Calendar, Printer,
  Clock, X, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
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
  
  // PDF Calibration State (Ajustes finos)
  const [coords, setCoords] = useState({
    temaX: 85, temaY: 158,
    instX: 85, instY: 182,
    tipoIntX: 387, tipoExtX: 460, tipoY: 177,
    fechaX: 85, fechaY: 207,
    durX: 335, durY: 207,
    tableX: 45, tableY: 258, tablePuestoX: 385,
    rowHeight: 19.8
  })

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
    setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const generatePDF = async () => {
    if (!selectedCourseId || selectedUserIds.length === 0 || !instructor || !duration) {
      toast.error('Complete todos los campos')
      return
    }

    setGenerating(true)
    try {
      const course = courses.find(c => c.courseId === selectedCourseId)
      const attendees = users.filter(u => selectedUserIds.includes(u.uid))

      const existingPdfBytes = await fetch('/machote-asistencia.pdf').then(res => res.arrayBuffer())
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

      // --- LLENADO USANDO COORDENADAS DINÁMICAS ---
      drawText(course?.title || '', coords.temaX, coords.temaY, 10, true)
      drawText(instructor, coords.instX, coords.instY, 9)
      
      if (trainingType === 'Interna') {
        drawText('X', coords.tipoIntX, coords.tipoY, 12, true) 
      } else {
        drawText('X', coords.tipoExtX, coords.tipoY, 12, true) 
      }

      drawText(trainingDate, coords.fechaX, coords.fechaY, 9)
      drawText(duration, coords.durX, coords.durY, 9)

      let yPos = coords.tableY
      attendees.forEach((user, index) => {
        if (index < 25) { 
          drawText(user.displayName, coords.tableX, yPos, 8)
          drawText(user.puesto, coords.tablePuestoX, yPos, 7)
          yPos += coords.rowHeight
        }
      })

      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `F-RH-02_${course?.title}.pdf`
      link.click()
      
      toast.success('PDF generado. ¡Verifique el ajuste!')
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setGenerating(false)
    }
  }

  const updateCoord = (key: keyof typeof coords, delta: number) => {
    setCoords(prev => ({ ...prev, [key]: prev[key] + delta }))
  }

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.cedula.includes(userSearch) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          Asistente de Firmas
        </h1>
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
          Modo Calibración Activo
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* PANEL DE CALIBRACIÓN (NUEVO) */}
        <Card className="xl:col-span-1 border-amber-200 shadow-sm bg-amber-50/30">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Ajuste de Posición
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 text-[10px]">
            <p className="text-muted-foreground italic">Usa estas flechas para mover los textos si salen desalineados.</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Encabezado (Y)</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                    updateCoord('temaY', -2); updateCoord('instY', -2); 
                    updateCoord('tipoY', -2); updateCoord('fechaY', -2); updateCoord('durY', -2);
                  }}><ChevronUp className="w-3 h-3"/></Button>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                    updateCoord('temaY', 2); updateCoord('instY', 2); 
                    updateCoord('tipoY', 2); updateCoord('fechaY', 2); updateCoord('durY', 2);
                  }}><ChevronDown className="w-3 h-3"/></Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Tabla (Y)</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCoord('tableY', -2)}><ChevronUp className="w-3 h-3"/></Button>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCoord('tableY', 2)}><ChevronDown className="w-3 h-3"/></Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Mover todo (X)</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                    updateCoord('temaX', -5); updateCoord('instX', -5); updateCoord('fechaX', -5); updateCoord('tableX', -5);
                  }}><ChevronLeft className="w-3 h-3"/></Button>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => {
                    updateCoord('temaX', 5); updateCoord('instX', 5); updateCoord('fechaX', 5); updateCoord('tableX', 5);
                  }}><ChevronRight className="w-3 h-3"/></Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-amber-200">
               <pre className="text-[8px] bg-white p-2 rounded border">
                 {JSON.stringify(coords, null, 2)}
               </pre>
            </div>
          </CardContent>
        </Card>

        {/* DATOS Y ASISTENTES */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-sm font-bold">Datos de la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tema</label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger><SelectValue placeholder="Curso" /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.courseId} value={c.courseId}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Instructor</label>
                <Input value={instructor} onChange={e => setInstructor(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                <Select value={trainingType} onValueChange={setTrainingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Interna</SelectItem>
                    <SelectItem value="Externa">Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                <Input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Duración</label>
                <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="0.5 Horas" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm font-bold">Asistentes ({selectedUserIds.length})</CardTitle>
              <Input placeholder="Buscar..." className="h-8 text-xs w-40 bg-white" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-1 divide-y">
                {filteredUsers.map(u => (
                  <div key={u.uid} className={cn("flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer", selectedUserIds.includes(u.uid) && "bg-primary/5")} onClick={() => toggleUser(u.uid)}>
                    <Checkbox checked={selectedUserIds.includes(u.uid)} onCheckedChange={() => toggleUser(u.uid)} />
                    <div className="min-w-0"><p className="text-xs font-bold truncate">{u.displayName}</p><p className="text-[9px] text-muted-foreground uppercase">{u.puesto}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ACCIÓN FINAL */}
        <div className="xl:col-span-1">
          <Button onClick={generatePDF} disabled={generating || loading || selectedUserIds.length === 0} className="w-full h-32 flex-col gap-4 text-xl font-black shadow-2xl shadow-primary/30 bg-slate-900 border-4 border-white rounded-3xl">
            {generating ? <Clock className="w-10 h-10 animate-spin" /> : <Printer className="w-10 h-10" />}
            IMPRIMIR REGISTRO
          </Button>
          
          <div className="mt-6 p-4 rounded-2xl bg-slate-100 border text-[10px] text-slate-500 leading-relaxed italic">
            <strong>Instrucciones:</strong> Si los textos no calzan con las celdas, usa el panel de "Ajuste de Posición" a la izquierda. Cada vez que toques una flecha y generes el PDF, verás cómo se mueve el texto.
          </div>
        </div>
      </div>
    </div>
  )
}

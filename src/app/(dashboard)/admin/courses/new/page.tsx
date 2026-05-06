'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createCourseWithVersion } from '@/lib/services/courseService'
import { CreateCoursePayload, QuizQuestion } from '@/types/course.types'
import { Department } from '@/types/user.types'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Save, Video, FileText, 
  HelpCircle, Plus, Trash2, CheckCircle2 
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const DEPARTMENTS: Department[] = ['produccion', 'mantenimiento', 'logistica']

export default function NewCoursePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<Omit<CreateCoursePayload, 'questions'>>({
    title: '',
    description: '',
    department: [],
    tags: [],
    validityDays: 365,
    videoUrl: '',
    documentUrl: '',
    changeLog: 'Versión inicial del curso.'
  })

  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'questionId'>[]>([
    { text: '', options: [{id: '1', text: ''}, {id: '2', text: ''}, {id: '3', text: ''}, {id: '4', text: ''}], correctId: '1', points: 1 },
  ])

  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: [{id: '1', text: ''}, {id: '2', text: ''}, {id: '3', text: ''}, {id: '4', text: ''}], correctId: '1', points: 1 }])
  }

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const handleToggleDept = (dept: Department) => {
    setFormData(prev => ({
      ...prev,
      department: prev.department.includes(dept)
        ? prev.department.filter(d => d !== dept)
        : [...prev.department, dept]
    }))
  }

  const handleQuestionChange = (idx: number, text: string) => {
    const q = [...questions]
    q[idx].text = text
    setQuestions(q)
  }

  const handleOptionChange = (qIdx: number, oIdx: number, text: string) => {
    const q = [...questions]
    q[qIdx].options[oIdx].text = text
    setQuestions(q)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.videoUrl || formData.department.length === 0) {
      toast.error('Complete los campos obligatorios y seleccione al menos un departamento.')
      return
    }

    // Basic validation for questions
    const invalidQuestion = questions.find(q => !q.text || q.options.some(o => !o.text))
    if (invalidQuestion) {
      toast.error('Complete todas las preguntas y opciones del quiz.')
      return
    }

    setLoading(true)
    try {
      await createCourseWithVersion({
        ...formData,
        questions
      }, profile!.uid)
      
      toast.success('Curso publicado exitosamente')
      router.push('/admin/courses')
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar el curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/admin/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Curso</h1>
          <p className="text-muted-foreground">Define el contenido y la evaluación de la capacitación.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título del Curso / Procedimiento</label>
                <Input 
                  placeholder="Ej: SOP-LIM-001: Limpieza de Equipos" 
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción corta</label>
                <Textarea 
                  placeholder="Resumen del contenido para el colaborador..." 
                  className="min-h-[100px]"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vigencia (Días)</label>
                  <Input 
                    type="number" 
                    value={formData.validityDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, validityDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiquetas (separadas por coma)</label>
                  <Input 
                    placeholder="BPM, Limpieza, Producción" 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, tags: e.target.value.split(',').map(s => s.trim())})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Contenido Multimedia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL del Video (YouTube, Drive, Vimeo)</label>
                <Input 
                  placeholder="https://..." 
                  value={formData.videoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, videoUrl: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Asegúrese de que el video tenga permisos de visualización para los colaboradores.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL de Documento SOP (Opcional)</label>
                <Input 
                  placeholder="https://..." 
                  value={formData.documentUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, documentUrl: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiz Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Evaluación ({questions.length} preguntas)
              </h2>
              <Button variant="outline" size="sm" onClick={addQuestion} className="gap-2">
                <Plus className="w-4 h-4" />
                Añadir Pregunta
              </Button>
            </div>
            
            {questions.map((q, qIdx) => (
              <Card key={qIdx} className="border-l-4 border-l-primary relative group/card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pregunta {qIdx + 1}</label>
                    {questions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/card:opacity-100 transition-opacity"
                        onClick={() => removeQuestion(qIdx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                    <Input 
                      placeholder="Escriba la pregunta aquí..." 
                      value={q.text}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuestionChange(qIdx, e.target.value)}
                    />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const newQ = [...questions]
                            newQ[qIdx].correctId = opt.id
                            setQuestions(newQ)
                          }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                            q.correctId === opt.id 
                              ? 'bg-primary border-primary text-primary-foreground' 
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          {q.correctId === opt.id && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <Input 
                          placeholder={`Opción ${oIdx + 1}`} 
                          className="flex-1 text-sm h-8"
                          value={opt.text}
                          onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Publicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Áreas Aplicables</label>
                <div className="flex flex-col gap-2">
                  {DEPARTMENTS.map(dept => (
                    <button
                      key={dept}
                      onClick={() => handleToggleDept(dept)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.department.includes(dept)
                          ? 'bg-primary/10 border-primary text-primary font-medium'
                          : 'hover:bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <span className="capitalize">{dept}</span>
                      {formData.department.includes(dept) && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium">Motivo de la versión</label>
                <Textarea 
                  placeholder="Ej: Versión inicial / Actualización por cambio de equipo..." 
                  className="text-xs min-h-[80px]"
                  value={formData.changeLog}
                  onChange={e => setFormData({...formData, changeLog: e.target.value})}
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full h-12 gap-2 text-base shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? <Plus className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'Publicando...' : 'Publicar Curso'}
              </Button>
            </CardContent>
          </Card>

          <div className="bg-muted/50 p-4 rounded-xl border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumen de Auditoría</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span className="font-medium text-amber-600">Borrador</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versión:</span>
                <span className="font-medium text-primary">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Autor:</span>
                <span className="font-medium">{profile?.displayName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

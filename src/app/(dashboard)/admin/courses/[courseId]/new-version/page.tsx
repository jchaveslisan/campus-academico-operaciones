'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getCourseById, getCourseVersionHistory, createCourseVersion } from '@/lib/services/courseService'
import { CourseDocument, CourseVersionDocument, QuizQuestion } from '@/types/course.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, Save, Plus, Trash2, 
  Video, FileText, History, AlertCircle,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'

export default function NewVersionPage() {
  const { courseId } = useParams() as { courseId: string }
  const { profile } = useAuth()
  const router = useRouter()
  
  const [course, setCourse] = useState<CourseDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    changeLog: '',
    videoUrl: '',
    documentUrl: '',
    questions: [] as QuizQuestion[]
  })

  useEffect(() => {
    loadCourse()
  }, [courseId])

  const loadCourse = async () => {
    try {
      const c = await getCourseById(courseId)
      const history = await getCourseVersionHistory(courseId)
      
      if (!c) throw new Error('Curso no encontrado')
      setCourse(c)
      
      // Pre-load with latest version data
      if (history.length > 0) {
        const latest = history[0] // history is sorted by date desc
        setFormData({
          changeLog: '', // User must explain what changed
          videoUrl: latest.videoUrl,
          documentUrl: latest.documentUrl,
          questions: latest.questions
        })
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    const newQ: QuizQuestion = {
      questionId: uuidv4(),
      text: '',
      options: [
        { id: uuidv4(), text: '' },
        { id: uuidv4(), text: '' }
      ],
      correctId: '',
      points: 1
    }
    setFormData(prev => ({ ...prev, questions: [...prev.questions, newQ] }))
  }

  const removeQuestion = (qId: string) => {
    setFormData(prev => ({ ...prev, questions: prev.questions.filter(q => q.questionId !== qId) }))
  }

  const updateQuestion = (qId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.questionId === qId ? { ...q, text } : q)
    }))
  }

  const updateOption = (qId: string, oId: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.questionId !== qId) return q
        return {
          ...q,
          options: q.options.map(o => o.id === oId ? { ...o, text } : o)
        }
      })
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.changeLog) {
      toast.error('Debe describir los cambios de esta versión')
      return
    }
    if (formData.questions.some(q => !q.correctId)) {
      toast.error('Todas las preguntas deben tener una respuesta correcta seleccionada')
      return
    }

    setSaving(true)
    try {
      await createCourseVersion(courseId, {
        ...formData,
        versionNumber: course!.currentVersion + 1,
        publishedBy: profile!.uid
      })
      toast.success('Nueva versión publicada exitosamente')
      router.push(`/admin/courses/${courseId}`)
    } catch (error) {
      toast.error('Error al publicar nueva versión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-20 text-center">Cargando datos del curso...</div>
  if (!course) return <div className="p-20 text-center text-red-500">Error: Curso no encontrado</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href={`/admin/courses/${courseId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Versión: {course.title}</h1>
          <p className="text-sm text-muted-foreground">Actualizando de la v{course.currentVersion}.0 a la v{course.currentVersion + 1}.0</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Change Log */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Registro de Cambios
            </CardTitle>
            <CardDescription>Explique qué se actualizó en este procedimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              required
              placeholder="Ej: Se actualizó el paso 3 del proceso de limpieza para incluir el nuevo sanitizante..."
              value={formData.changeLog}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, changeLog: e.target.value})}
              className="bg-white min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Media Update */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                Video del SOP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                placeholder="URL del nuevo video..."
                value={formData.videoUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, videoUrl: e.target.value})}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documento de Referencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                placeholder="URL del nuevo PDF/Documento..."
                value={formData.documentUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, documentUrl: e.target.value})}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quiz Update */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Evaluación Actualizada
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-1">
              <Plus className="w-4 h-4" /> Añadir Pregunta
            </Button>
          </div>

          <div className="space-y-4">
            {formData.questions.map((q, qIdx) => (
              <Card key={q.questionId} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/20" />
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">
                      {qIdx + 1}
                    </span>
                    <Input 
                      placeholder="Escriba la pregunta..."
                      value={q.text}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuestion(q.questionId, e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeQuestion(q.questionId)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={q.correctId === opt.id ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            const newQs = [...formData.questions]
                            newQs[qIdx].correctId = opt.id
                            setFormData({...formData, questions: newQs})
                          }}
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Input 
                          placeholder={`Opción ${oIdx + 1}`}
                          value={opt.text}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(q.questionId, opt.id, e.target.value)}
                          className={q.correctId === opt.id ? 'border-primary ring-1 ring-primary' : ''}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            Al publicar esta versión, el sistema marcará como "Pendiente de Actualización" a todos los colaboradores para asegurar que conozcan los nuevos cambios del procedimiento.
          </p>
        </div>

        <Button type="submit" disabled={saving} className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20">
          {saving ? 'Publicando...' : 'Publicar Nueva Versión'}
        </Button>
      </form>
    </div>
  )
}

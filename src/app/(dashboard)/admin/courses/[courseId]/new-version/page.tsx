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
  HelpCircle, Link as LinkIcon, FilePlus
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'

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
    materials: [] as Array<{ title: string; url: string }>,
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
        const latest = history[0]
        
        // Handle migration from old documentUrl to new materials array
        let initialMaterials = latest.materials || []
        if (initialMaterials.length === 0 && (latest as any).documentUrl) {
          initialMaterials = [{ title: 'Documento SOP', url: (latest as any).documentUrl }]
        }
        if (initialMaterials.length === 0) {
          initialMaterials = [{ title: '', url: '' }]
        }

        setFormData({
          changeLog: '',
          videoUrl: latest.videoUrl,
          materials: initialMaterials,
          questions: latest.questions
        })
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { title: '', url: '' }]
    }))
  }

  const removeMaterial = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== idx)
    }))
  }

  const handleMaterialChange = (idx: number, field: 'title' | 'url', value: string) => {
    const newMaterials = [...formData.materials]
    newMaterials[idx][field] = value
    setFormData({ ...formData, materials: newMaterials })
  }

  const addQuestion = () => {
    const newQ: QuizQuestion = {
      questionId: uuidv4(),
      text: '',
      options: [
        { id: uuidv4(), text: '' },
        { id: uuidv4(), text: '' },
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Contenido Multimedia
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addMaterial} className="gap-2 h-8 text-[10px] uppercase font-bold">
              <FilePlus className="w-3.5 h-3.5" />
              Agregar Material
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL del Video (YouTube, Drive, Vimeo)</label>
              <div className="relative">
                <Video className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="https://..." 
                  className="pl-10"
                  value={formData.videoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, videoUrl: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <label className="text-sm font-medium">Material de Referencia (Links a documentos)</label>
              <div className="space-y-3">
                <AnimatePresence>
                  {formData.materials.map((m, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: 10 }}
                      className="flex gap-2 items-start"
                    >
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <Input 
                          placeholder="Nombre (Ej: Manual PDF)" 
                          value={m.title}
                          onChange={(e) => handleMaterialChange(idx, 'title', e.target.value)}
                          className="h-9 text-xs"
                        />
                        <div className="relative">
                          <LinkIcon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="URL del enlace" 
                            value={m.url}
                            onChange={(e) => handleMaterialChange(idx, 'url', e.target.value)}
                            className="h-9 text-xs pl-8"
                          />
                        </div>
                      </div>
                      {formData.materials.length > 1 && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMaterial(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <Card key={q.questionId} className="relative overflow-hidden group/card">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/20" />
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-4 items-center">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-primary">
                      {qIdx + 1}
                    </span>
                    <Input 
                      placeholder="Escriba la pregunta..."
                      value={q.text}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuestion(q.questionId, e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeQuestion(q.questionId)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/card:opacity-100 transition-opacity"
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
                          className={cn("h-8 w-8 flex-shrink-0 rounded-full", q.correctId === opt.id && "bg-green-600 hover:bg-green-700")}
                          onClick={() => {
                            const newQs = [...formData.questions]
                            newQs[qIdx].correctId = opt.id
                            setFormData({...formData, questions: newQs})
                          }}
                        >
                          {q.correctId === opt.id ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-3 h-3" />}
                        </Button>
                        <Input 
                          placeholder={`Opción ${oIdx + 1}`}
                          value={opt.text}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(q.questionId, opt.id, e.target.value)}
                          className={q.correctId === opt.id ? 'border-green-600 ring-1 ring-green-600/20' : ''}
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

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getCourseById, getCourseVersion } from '@/lib/services/courseService'
import { getEnrollmentById, recordVideoClick, confirmVideoWatched, submitQuiz, addDoubt, resolveDoubts } from '@/lib/services/enrollmentService'
import { CourseDocument, CourseVersionDocument } from '@/types/course.types'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Award, FileDown, CheckCircle, ArrowLeft, 
  Video, Info, Loader2, Trophy, XCircle, 
  ExternalLink, Play, MessageSquare, Send,
  HelpCircle, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import QuizContainer from '@/components/quiz/QuizContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { generateCertificatePDF } from '@/lib/utils/pdfGenerator'
import { v4 as uuidv4 } from 'uuid'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function CourseDetailPage() {
  const { courseId } = useParams() as { courseId: string }
  const searchParams = useSearchParams()
  const enrollmentId = searchParams.get('enrollmentId')
  const { profile } = useAuth()
  const router = useRouter()

  const [course, setCourse] = useState<CourseDocument | null>(null)
  const [version, setVersion] = useState<CourseVersionDocument | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [step, setStep] = useState<'intro' | 'video' | 'doubts' | 'quiz' | 'result'>('intro')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number; totalPoints: number } | null>(null)
  
  const [newDoubt, setNewDoubt] = useState('')
  const [sendingDoubt, setSendingDoubt] = useState(false)

  useEffect(() => {
    loadData()
  }, [courseId, enrollmentId])

  const loadData = async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const c = await getCourseById(courseId)
      if (!c) {
        setError('El curso solicitado no existe o ha sido desactivado.')
        return
      }
      setCourse(c)

      const v = await getCourseVersion(c.latestVersionId)
      if (!v) {
        setError('Este curso no tiene una versión activa disponible en este momento.')
        return
      }
      setVersion(v)

      if (enrollmentId) {
        const e = await getEnrollmentById(enrollmentId)
        setEnrollment(e)
      }
    } catch (error: any) {
      console.error('Error loading course:', error)
      setError('Hubo un problema al cargar los datos del curso. Por favor, reintente.')
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleStartVideo = async () => {
    if (!enrollmentId || !version) return
    setLoading(true)
    try {
      const id = await recordVideoClick(enrollmentId, profile!.uid, courseId, version.versionId)
      setAttemptId(id)
      setStep('video')
    } catch (error) {
      toast.error('Error al iniciar capacitación')
    } finally {
      setLoading(false)
    }
  }

  const handleFinishVideo = async () => {
    if (!attemptId) return
    setLoading(true)
    try {
      await confirmVideoWatched(attemptId)
      setStep('doubts')
    } catch (error) {
      toast.error('Error al confirmar video')
    } finally {
      setLoading(false)
    }
  }

  const handleSendDoubt = async () => {
    if (!enrollmentId || !newDoubt.trim() || !profile) return
    setSendingDoubt(true)
    try {
      const doubt = {
        id: uuidv4(),
        userId: profile.uid,
        userName: profile.displayName,
        message: newDoubt.trim(),
        isReply: false
      }
      await addDoubt(enrollmentId, doubt)
      setNewDoubt('')
      // Refresh enrollment to show new doubt
      const updated = await getEnrollmentById(enrollmentId)
      setEnrollment(updated)
      toast.success('Duda enviada. Por favor espere respuesta de su líder.')
    } catch (error) {
      toast.error('Error al enviar duda')
    } finally {
      setSendingDoubt(false)
    }
  }

  const handleStartQuiz = async () => {
    if (!enrollmentId) return
    setLoading(true)
    try {
      await resolveDoubts(enrollmentId, true)
      setStep('quiz')
    } catch (error) {
      toast.error('Error al iniciar cuestionario')
    } finally {
      setLoading(false)
    }
  }

  const handleQuizComplete = async (answers: any[]) => {
    if (!enrollmentId || !attemptId || !course) return
    setLoading(true)
    try {
      const result = await submitQuiz(enrollmentId, attemptId, answers, course)
      setQuizResult({ ...result, totalPoints: answers.length })
      setStep('result')
      
      if (result.passed) {
        const certId = uuidv4().split('-')[0].toUpperCase()
        const issuedAt = new Date()
        const expiresAt = course.validityDays > 0 
          ? new Date(issuedAt.getTime() + course.validityDays * 24 * 60 * 60 * 1000)
          : null
        
        await addDoc(collection(db, 'certificates'), {
          certificateId: certId,
          enrollmentId,
          attemptId,
          userId: profile!.uid,
          courseId,
          versionId: version!.versionId,
          courseName: course.title,
          versionNumber: version!.versionNumber,
          userName: profile!.displayName,
          userCedula: profile!.cedula,
          userPuesto: profile!.puesto,
          userDepartment: profile!.department,
          score: result.score,
          issuedAt: Timestamp.fromDate(issuedAt),
          expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
          isRevoked: false,
        })
      }
    } catch (error) {
      toast.error('Error al enviar respuestas')
    } finally {
      setLoading(false)
    }
  }

  const handleCertificateDownload = async () => {
    if (!course || !version || !quizResult || !profile) return
    setLoading(true)
    try {
      const issuedAt = new Date()
      const expiresAt = course.validityDays > 0 
        ? new Date(issuedAt.getTime() + course.validityDays * 24 * 60 * 60 * 1000)
        : null
      
      await generateCertificatePDF({
        certificateId: 'TEMP-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        enrollmentId: enrollmentId || '',
        attemptId: attemptId || '',
        userId: profile.uid,
        courseId: course.courseId,
        versionId: version.versionId,
        courseName: course.title,
        versionNumber: version.versionNumber,
        userName: profile.displayName,
        userCedula: profile.cedula,
        userPuesto: profile.puesto,
        userDepartment: profile.department,
        score: quizResult.score,
        issuedAt,
        expiresAt,
        isRevoked: false,
        revokedAt: null
      })
      toast.success('Certificado generado correctamente')
    } catch (error) {
      toast.error('Error al generar PDF')
    } finally {
      setLoading(false)
    }
  }

  if (loading && step === 'intro') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Cargando capacitación...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-6 text-center px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">No se pudo cargar el curso</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error}</p>
        </div>
        <Link href="/home">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Link href="/home">
              <Button variant="ghost" className="gap-2 -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{course?.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Versión {course?.currentVersion}</Badge>
                <Badge variant="secondary" className="capitalize">{profile?.department}</Badge>
              </div>
            </div>

            <Card className="border-none bg-primary/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary mt-1" />
                  <div className="space-y-1">
                    <p className="font-semibold">Instrucciones</p>
                    <p className="text-sm text-muted-foreground">
                      Para aprobar esta capacitación debe:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-2">
                      <li>Ver el video del procedimiento completo.</li>
                      <li>Evacuar cualquier duda con su líder o capacitador.</li>
                      <li>Responder el cuestionario de {version?.questions.length} preguntas.</li>
                      <li>Obtener al menos un 80% de aciertos.</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={handleStartVideo} className="w-full gap-2 h-12 text-base shadow-lg shadow-primary/20">
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar Capacitación
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold">Descripción del procedimiento</h3>
              <p className="text-muted-foreground leading-relaxed">
                {course?.description}
              </p>
            </div>
          </motion.div>
        )}

        {step === 'video' && (
          <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                 <Video className="w-5 h-5 text-primary" />
                 Paso 1: Ver Video del SOP
               </h2>
               <Badge className="bg-amber-500 animate-pulse">En progreso</Badge>
             </div>

             <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 p-10 text-center">
                  <Play className="w-16 h-16 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Procedimiento en Video</h3>
                  <p className="text-sm opacity-80 mb-6">Haga clic abajo para abrir el video en una nueva ventana. Al finalizar, regrese aquí.</p>
                  <a 
                    href={version?.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary/90 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/40"
                  >
                    Abrir Video <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
             </div>

             <div className="bg-white p-8 rounded-3xl border shadow-sm text-center space-y-6">
               <div className="space-y-2">
                 <p className="font-bold text-lg text-slate-800">¿Ha terminado de ver el video y comprende el procedimiento?</p>
                 <p className="text-sm text-muted-foreground text-pretty max-w-lg mx-auto">Al confirmar, pasará a la sección de evacuación de dudas donde podrá consultar cualquier detalle antes de realizar el examen.</p>
               </div>
               <Button size="lg" onClick={handleFinishVideo} className="gap-2 px-12 h-14 rounded-2xl shadow-lg shadow-primary/20">
                 Sí, lo he visto completo <CheckCircle className="w-5 h-5" />
               </Button>
             </div>
          </motion.div>
        )}

        {step === 'doubts' && (
          <motion.div key="doubts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                 <MessageSquare className="w-5 h-5 text-primary" />
                 Paso 2: Evacuación de Dudas
               </h2>
               <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Consultas</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Doubts Chat */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-lg border-none bg-slate-50/50">
                  <CardHeader className="pb-3 border-b bg-white">
                    <CardTitle className="text-base flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      ¿Tiene alguna duda sobre el procedimiento?
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Escriba sus dudas para que un líder pueda responderlas. Si no tiene dudas, puede avanzar al cuestionario.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[350px] overflow-y-auto p-4 space-y-4 min-h-[100px]">
                      {enrollment?.doubts && enrollment.doubts.length > 0 ? (
                        enrollment.doubts.map((d) => (
                          <div key={d.id} className={cn(
                            "flex flex-col max-w-[85%] rounded-2xl p-3 text-sm shadow-sm",
                            d.isReply 
                              ? "bg-primary text-white ml-auto rounded-tr-none" 
                              : "bg-white text-slate-800 mr-auto rounded-tl-none border"
                          )}>
                            <p className="text-[10px] font-bold uppercase mb-1 opacity-70">
                              {d.isReply ? 'Líder / Capacitador' : d.userName}
                            </p>
                            <p className="leading-relaxed">{d.message}</p>
                            <p className="text-[9px] mt-2 text-right opacity-60">
                              {formatDistanceToNow(new Date((d.timestamp as any).toDate?.() ?? d.timestamp), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-40 grayscale">
                          <MessageSquare className="w-12 h-12 mb-2" />
                          <p className="text-sm italic">Aún no se han registrado consultas.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 border-t bg-white flex gap-2">
                      <Input 
                        placeholder="Escriba su consulta aquí..." 
                        className="flex-1 bg-slate-50"
                        value={newDoubt}
                        onChange={(e) => setNewDoubt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDoubt()}
                      />
                      <Button 
                        size="icon" 
                        disabled={sendingDoubt || !newDoubt.trim()} 
                        onClick={handleSendDoubt}
                      >
                        {sendingDoubt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Reference Materials */}
              <div className="space-y-6">
                <Card className="shadow-lg border-none h-full">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Material de Consulta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {version?.materials && version.materials.length > 0 ? (
                        version.materials.map((m, idx) => (
                          <a 
                            key={idx} 
                            href={m.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{m.title || 'Documento'}</p>
                              <p className="text-[10px] text-muted-foreground truncate">Clic para abrir</p>
                            </div>
                          </a>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <p className="text-[10px] italic">No hay documentos adicionales adjuntos.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border shadow-sm text-center space-y-6">
               <div className="space-y-2">
                 <p className="font-bold text-lg text-slate-800">¿Están sus dudas evacuadas?</p>
                 <p className="text-sm text-muted-foreground text-pretty max-w-lg mx-auto">Solo avance si se siente completamente seguro(a) para realizar la evaluación final.</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button variant="outline" className="h-14 rounded-2xl px-8" onClick={() => router.push('/home')}>
                   Salir y preguntar luego
                 </Button>
                 <Button size="lg" onClick={handleStartQuiz} className="gap-2 px-12 h-14 rounded-2xl shadow-lg shadow-primary/20 bg-green-600 hover:bg-green-700">
                   Iniciar Cuestionario <CheckCircle2 className="w-5 h-5" />
                 </Button>
               </div>
            </div>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <QuizContainer 
              questions={version?.questions || []} 
              onComplete={handleQuizComplete}
              loading={loading}
            />
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 space-y-8">
            <div className="flex justify-center">
              {quizResult?.passed ? (
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/40">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h1 className={cn("text-4xl font-black", quizResult?.passed ? "text-green-600" : "text-red-600")}>
                {quizResult?.passed ? "¡CURSO APROBADO!" : "CURSO REPROBADO"}
              </h1>
              <p className="text-xl text-muted-foreground">
                Tu puntaje: <span className="font-bold text-foreground">{quizResult?.score} de {quizResult?.totalPoints}</span>
              </p>
            </div>

            {quizResult?.passed ? (
              <Card className="max-w-md mx-auto border-2 border-green-500/20 bg-green-500/5">
                <CardContent className="p-8 space-y-6">
                  <p className="text-sm leading-relaxed text-slate-700">
                    Felicidades, has completado satisfactoriamente la capacitación de <strong>{course?.title}</strong>.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={handleCertificateDownload}
                      disabled={loading}
                      className="w-full gap-2 h-12 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                    >
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Award className="w-5 h-5" />}
                      Descargar Certificado
                    </Button>
                    
                    <div className="pt-4 border-t space-y-4">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-left">Resumen de Evaluación</p>
                      <div className="space-y-2 text-left max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {version?.questions.map((q, idx) => (
                          <div key={q.questionId} className="p-3 rounded-xl bg-white border border-green-100 space-y-2">
                            <p className="text-xs font-bold text-slate-800">{idx + 1}. {q.text}</p>
                            <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 p-2 rounded-lg font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Respuesta: {q.options.find(o => o.id === q.correctId)?.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link href="/home" className="w-full">
                      <Button variant="outline" className="w-full h-12 rounded-xl mt-4">Finalizar</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-md mx-auto border-2 border-red-500/20 bg-red-500/5">
                <CardContent className="p-8 space-y-6">
                  <p className="text-sm leading-relaxed text-slate-700">
                    No has alcanzado el puntaje mínimo de aprobación (80%). Debes repasar el material y volver a intentarlo desde el inicio.
                  </p>
                  <Button variant="destructive" onClick={() => window.location.reload()} className="w-full h-12 gap-2 shadow-lg shadow-red-600/20">
                    Intentar de Nuevo
                  </Button>
                  <Link href="/home" className="block text-sm text-muted-foreground hover:underline">
                    Volver al Dashboard
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

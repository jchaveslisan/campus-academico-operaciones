'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getCourseById, getCourseVersion } from '@/lib/services/courseService'
import { getEnrollmentById, recordVideoClick, confirmVideoWatched, submitQuiz } from '@/lib/services/enrollmentService'
import { CourseDocument, CourseVersionDocument } from '@/types/course.types'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, FileDown, CheckCircle, ArrowLeft, Video, Info, Loader2, Trophy, XCircle, ExternalLink, Play } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import QuizContainer from '@/components/quiz/QuizContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { generateCertificatePDF } from '@/lib/utils/pdfGenerator'
import { v4 as uuidv4 } from 'uuid'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

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
  
  const [step, setStep] = useState<'intro' | 'video' | 'quiz' | 'result'>('intro')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number; totalPoints: number } | null>(null)

  useEffect(() => {
    loadData()
  }, [courseId, enrollmentId])

  const loadData = async () => {
    setLoading(true)
    try {
      const c = await getCourseById(courseId)
      if (!c) throw new Error('Curso no encontrado')
      setCourse(c)

      const v = await getCourseVersion(c.latestVersionId)
      setVersion(v)

      if (enrollmentId) {
        const e = await getEnrollmentById(enrollmentId)
        setEnrollment(e)
      }
    } catch (error: any) {
      toast.error(error.message)
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
      setStep('quiz')
    } catch (error) {
      toast.error('Error al confirmar video')
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
        // Create certificate record in Firestore for permanence
        const certId = uuidv4().split('-')[0].toUpperCase()
        const issuedAt = new Date()
        const expiresAt = new Date(issuedAt.getTime() + course.validityDays * 24 * 60 * 60 * 1000)
        
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
          expiresAt: Timestamp.fromDate(expiresAt),
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
      const expiresAt = new Date(issuedAt.getTime() + course.validityDays * 24 * 60 * 60 * 1000)
      
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
                      <li>Responder el cuestionario de {version?.questions.length} preguntas.</li>
                      <li>Obtener al menos un 80% de aciertos.</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={handleStartVideo} className="w-full gap-2 h-12 text-base">
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
          <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <Video className="w-5 h-5 text-primary" />
                 Paso 1: Ver Video del SOP
               </h2>
               <Badge className="bg-amber-500">En progreso</Badge>
             </div>

             <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
                {/* Enlace externo placeholder ya que no podemos embeber todo tipo de URLs fácilmente */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/60 p-10 text-center">
                  <Play className="w-16 h-16 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">Procedimiento en Video</h3>
                  <p className="text-sm opacity-80 mb-6">Haga clic abajo para abrir el video en una nueva ventana. Al finalizar, regrese aquí.</p>
                  <a 
                    href={version?.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-primary/90 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                  >
                    Abrir Video <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
             </div>

             <div className="bg-muted/50 p-6 rounded-2xl border text-center space-y-4">
               <p className="font-medium">¿Ha terminado de ver el video y comprende el procedimiento?</p>
               <Button size="lg" onClick={handleFinishVideo} className="gap-2 px-10">
                 Sí, lo he visto completo <CheckCircle className="w-5 h-5" />
               </Button>
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
                  <p className="text-sm leading-relaxed">
                    Felicidades, has completado satisfactoriamente la capacitación de <strong>{course?.title}</strong>.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={handleCertificateDownload}
                      disabled={loading}
                      className="w-full gap-2 h-12 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Award className="w-5 h-5" />}
                      Descargar Certificado
                    </Button>
                    <Link href="/home" className="w-full">
                      <Button variant="outline" className="w-full h-12">Finalizar</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-md mx-auto border-2 border-red-500/20 bg-red-500/5">
                <CardContent className="p-8 space-y-6">
                  <p className="text-sm leading-relaxed">
                    No has alcanzado el puntaje mínimo de aprobación (80%). Debes repasar el material y volver a intentarlo desde el inicio.
                  </p>
                  <Button variant="destructive" onClick={() => window.location.reload()} className="w-full h-12 gap-2">
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


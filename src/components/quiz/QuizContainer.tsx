'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { QuizQuestion } from '@/types/course.types'
import { CheckCircle2, XCircle, ChevronRight, Trophy, AlertTriangle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizContainerProps {
  questions: QuizQuestion[]
  onComplete: (answers: { questionId: string; selectedId: string; isCorrect: boolean }[]) => void
  loading?: boolean
}

export default function QuizContainer({ questions, onComplete, loading }: QuizContainerProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; selectedId: string; isCorrect: boolean }[]>([])

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <div className="space-y-1">
          <p className="font-bold">No hay preguntas disponibles</p>
          <p className="text-sm text-muted-foreground">Esta versión del curso no contiene cuestionario.</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIdx]
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0

  const handleSelect = (optionId: string) => {
    if (isAnswered) return
    setSelectedId(optionId)
  }

  const handleConfirm = () => {
    if (!selectedId || isAnswered) return
    
    const isCorrect = selectedId === currentQuestion.correctId
    setIsAnswered(true)
    
    setAnswers(prev => [...prev, {
      questionId: currentQuestion.questionId,
      selectedId,
      isCorrect
    }])
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1)
      setSelectedId(null)
      setIsAnswered(false)
    } else {
      onComplete(answers)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 md:space-y-8 py-4 md:py-10">
      {/* Header / Progress */}
      <div className="space-y-3 px-2">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-primary font-bold text-base md:text-lg">Pregunta {currentIdx + 1}</span>
            <span className="text-muted-foreground text-xs md:text-sm"> / {questions.length}</span>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Aprobación: 80%
          </span>
        </div>
        <Progress value={progress} className="h-2 md:h-3 rounded-full bg-muted overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </Progress>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-border/50 shadow-xl rounded-2xl md:rounded-3xl overflow-hidden">
            <CardContent className="p-5 md:p-8 space-y-6 md:space-y-8">
              <h2 className="text-lg md:text-2xl font-bold text-center leading-tight text-slate-800">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedId === option.id
                  
                  return (
                    <motion.button
                      key={option.id}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      onClick={() => handleSelect(option.id)}
                      disabled={isAnswered}
                      className={cn(
                        "relative flex items-center gap-3 md:gap-4 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 text-left transition-all duration-200",
                        !isAnswered && isSelected && "border-primary bg-primary/5 shadow-sm",
                        !isAnswered && !isSelected && "border-border hover:border-primary/50",
                        isAnswered && isSelected && "border-slate-400 bg-slate-50",
                        isAnswered && !isSelected && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-bold text-sm md:text-lg flex-shrink-0 transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        isAnswered && isSelected && "bg-slate-500 text-white"
                      )}>
                        {isAnswered && isSelected ? <Check className="w-4 h-4 md:w-6 md:h-6" /> : String.fromCharCode(65 + idx)}
                      </div>
                      
                      <span className={cn(
                        "flex-1 font-medium text-sm md:text-lg",
                        isSelected ? "text-slate-900" : "text-slate-600"
                      )}>
                        {option.text}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center pt-2 md:pt-4 px-4">
        {!isAnswered ? (
          <Button 
            size="lg" 
            className="w-full md:w-auto md:px-12 py-6 md:py-7 rounded-xl md:rounded-2xl text-base md:text-lg font-bold gap-2 shadow-lg shadow-primary/30"
            disabled={!selectedId}
            onClick={handleConfirm}
          >
            Confirmar Respuesta
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        ) : (
          <Button 
            size="lg" 
            variant={currentIdx === questions.length - 1 ? 'default' : 'secondary'}
            className="w-full md:w-auto md:px-12 py-6 md:py-7 rounded-xl md:rounded-2xl text-base md:text-lg font-bold gap-2 animate-in fade-in zoom-in duration-300"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : currentIdx === questions.length - 1 ? 'Ver Resultado' : 'Siguiente Pregunta'}
            {!loading && <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />}
          </Button>
        )}
      </div>
    </div>
  )
}

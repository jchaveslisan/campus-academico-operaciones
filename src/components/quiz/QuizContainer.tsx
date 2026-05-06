'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { QuizQuestion } from '@/types/course.types'
import { CheckCircle2, XCircle, ChevronRight, Trophy, AlertTriangle, Loader2 } from 'lucide-react'
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

  const currentQuestion = questions[currentIdx]
  const progress = ((currentIdx + 1) / questions.length) * 100

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
    <div className="w-full max-w-2xl mx-auto space-y-8 py-10">
      {/* Header / Progress */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-primary font-bold text-lg">Pregunta {currentIdx + 1}</span>
            <span className="text-muted-foreground text-sm"> / {questions.length}</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Aprobación: 80%
          </span>
        </div>
        <Progress value={progress} className="h-3 rounded-full bg-muted overflow-hidden">
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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <Card className="border-2 border-border/50 shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <h2 className="text-xl md:text-2xl font-bold text-center leading-tight">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedId === option.id
                  const isCorrect = option.id === currentQuestion.correctId
                  const showResult = isAnswered

                  return (
                    <motion.button
                      key={option.id}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      onClick={() => handleSelect(option.id)}
                      disabled={isAnswered}
                      className={cn(
                        "relative flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200",
                        !isAnswered && isSelected && "border-primary bg-primary/5 shadow-md",
                        !isAnswered && !isSelected && "border-border hover:border-primary/50",
                        isAnswered && isCorrect && "border-green-500 bg-green-500/10",
                        isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                        isAnswered && !isSelected && !isCorrect && "opacity-50 grayscale-[0.5]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 transition-colors",
                        !isAnswered && isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        isAnswered && isCorrect ? "bg-green-500 text-white" : "",
                        isAnswered && isSelected && !isCorrect ? "bg-red-500 text-white" : ""
                      )}>
                        {isAnswered && isCorrect ? <CheckCircle2 className="w-6 h-6" /> : 
                         isAnswered && isSelected && !isCorrect ? <XCircle className="w-6 h-6" /> : 
                         String.fromCharCode(65 + idx)}
                      </div>
                      
                      <span className="flex-1 font-medium text-lg">{option.text}</span>

                      {isAnswered && isCorrect && (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }} 
                          className="text-green-500 font-bold text-xs uppercase"
                        >
                          Correcto
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-center pt-4">
        {!isAnswered ? (
          <Button 
            size="lg" 
            className="px-12 py-7 rounded-2xl text-lg font-bold gap-2 shadow-lg shadow-primary/30"
            disabled={!selectedId}
            onClick={handleConfirm}
          >
            Confirmar Respuesta
            <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button 
            size="lg" 
            variant={currentIdx === questions.length - 1 ? 'default' : 'secondary'}
            className="px-12 py-7 rounded-2xl text-lg font-bold gap-2 animate-in fade-in zoom-in duration-300"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : currentIdx === questions.length - 1 ? 'Ver Resultado' : 'Siguiente Pregunta'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </Button>
        )}
      </div>
    </div>
  )
}

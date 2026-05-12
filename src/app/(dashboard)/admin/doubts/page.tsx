'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { EnrollmentDocument } from '@/types/enrollment.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, User, BookOpen, Send, CheckCircle2, Loader2, Clock } from 'lucide-react'
import { addDoubt, resolveDoubts } from '@/lib/services/enrollmentService'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/context/AuthContext'

export default function AdminDoubtsPage() {
  const { profile } = useAuth()
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadDoubts()
  }, [])

  const loadDoubts = async () => {
    setLoading(true)
    try {
      // Query enrollments that have doubts
      // Note: Since we can't easily query array length > 0 in Firestore without a counter,
      // we'll fetch recently updated ones and filter in memory, or use a specific flag.
      // For now, let's fetch all active ones and filter.
      const q = query(
        collection(db, 'enrollments'),
        where('status', 'in', ['pending', 'in_progress'])
      )
      const snap = await getDocs(q)
      const data = snap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .filter((e: any) => e.doubts && e.doubts.length > 0)
        .sort((a: any, b: any) => {
          const lastA = a.doubts[a.doubts.length - 1].timestamp?.toMillis() || 0
          const lastB = b.doubts[b.doubts.length - 1].timestamp?.toMillis() || 0
          return lastB - lastA
        })
      
      setEnrollments(data)
    } catch (error) {
      toast.error('Error al cargar dudas')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReply = async (enrollmentId: string) => {
    const message = replies[enrollmentId]
    if (!message?.trim() || !profile) return

    setSending(prev => ({ ...prev, [enrollmentId]: true }))
    try {
      const reply = {
        id: uuidv4(),
        userId: profile.uid,
        userName: profile.displayName,
        message: message.trim(),
        isReply: true
      }
      await addDoubt(enrollmentId, reply)
      setReplies(prev => ({ ...prev, [enrollmentId]: '' }))
      loadDoubts()
      toast.success('Respuesta enviada correctamente')
    } catch (error) {
      toast.error('Error al enviar respuesta')
    } finally {
      setSending(prev => ({ ...prev, [enrollmentId]: false }))
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Centro de Dudas</h1>
        <p className="text-muted-foreground">Evacua las consultas de los colaboradores para que puedan realizar sus evaluaciones.</p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="border-dashed py-20">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">¡Todo al día!</h3>
              <p className="text-sm text-muted-foreground">No hay dudas pendientes de evacuación en este momento.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enrollments.map((e) => {
            const lastDoubt = e.doubts[e.doubts.length - 1]
            const isWaitingForLeader = !lastDoubt.isReply

            return (
              <Card key={e.id} className={cn(
                "shadow-xl border-none overflow-hidden flex flex-col h-full",
                isWaitingForLeader ? "ring-2 ring-primary/20 shadow-primary/5" : "opacity-80"
              )}>
                <CardHeader className="pb-3 bg-white border-b">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-bold">{e.userName || 'Usuario'}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                        <BookOpen className="w-3 h-3" />
                        Curso: {e.courseId} (v{e.versionNumber})
                      </div>
                    </div>
                    {isWaitingForLeader ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 animate-pulse">Pendiente de respuesta</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Respondido</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col">
                  {/* Chat Area */}
                  <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {e.doubts.map((d: any) => (
                      <div key={d.id} className={cn(
                        "flex flex-col max-w-[90%] rounded-2xl p-3 text-xs shadow-sm",
                        d.isReply 
                          ? "bg-primary text-white ml-auto rounded-tr-none" 
                          : "bg-white text-slate-800 mr-auto rounded-tl-none border"
                      )}>
                        <p className="font-bold mb-1 opacity-70">
                          {d.isReply ? 'Tú (Líder)' : d.userName}
                        </p>
                        <p className="leading-relaxed">{d.message}</p>
                        <p className="text-[8px] mt-1 text-right opacity-60">
                          {formatDistanceToNow(new Date(d.timestamp?.toMillis() || 0), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 border-t bg-white flex gap-2">
                    <Input 
                      placeholder="Escribe tu respuesta..." 
                      className="flex-1"
                      value={replies[e.id] || ''}
                      onChange={(ev) => setReplies(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      onKeyDown={(ev) => ev.key === 'Enter' && handleSendReply(e.id)}
                    />
                    <Button 
                      size="icon" 
                      disabled={sending[e.id] || !replies[e.id]?.trim()} 
                      onClick={() => handleSendReply(e.id)}
                    >
                      {sending[e.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

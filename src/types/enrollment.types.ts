export type EnrollmentStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'expired'

export interface EnrollmentDocument {
  enrollmentId: string
  userId: string
  courseId: string
  versionId: string
  versionNumber: number
  status: EnrollmentStatus
  assignedBy: string
  assignedAt: Date
  dueDate: Date | null
  expiresAt: Date | null   // calculated from course validityDays upon passing
  attempts: number
  lastAttemptAt: Date | null
  doubts: Array<{
    id: string
    userId: string
    userName: string
    message: string
    timestamp: Date
    isReply: boolean
  }>
  isDoubtsResolved: boolean
}

export interface AttemptAnswer {
  questionId: string
  selectedId: string
  isCorrect: boolean
}

export interface AttemptDocument {
  attemptId: string
  enrollmentId: string
  userId: string
  courseId: string
  versionId: string
  attemptNumber: number
  videoClickedAt: Date | null
  videoConfirmedAt: Date | null
  quizStartedAt: Date | null
  quizSubmittedAt: Date | null
  answers: AttemptAnswer[]
  score: number
  totalQuestions: number
  passed: boolean
  ipAddress: string
  userAgent: string
}

export interface CertificateDocument {
  certificateId: string
  enrollmentId: string
  attemptId: string
  userId: string
  courseId: string
  versionId: string
  courseName: string
  versionNumber: number
  userName: string
  userCedula: string
  userPuesto: string
  userDepartment: string
  score: number
  issuedAt: Date
  expiresAt: Date | null
  isRevoked: boolean
  revokedAt: Date | null
}

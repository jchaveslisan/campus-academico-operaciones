export type AuditAction =
  | 'PIN_LOGIN_SUCCESS'
  | 'PIN_LOGIN_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DEACTIVATED'
  | 'COURSE_CREATED'
  | 'COURSE_VERSION_CREATED'
  | 'COURSE_VERSION_DEPRECATED'
  | 'USER_ENROLLED'
  | 'VIDEO_CLICKED'
  | 'VIDEO_CONFIRMED'
  | 'QUIZ_STARTED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'CERTIFICATE_ISSUED'
  | 'CERTIFICATE_DOWNLOADED'
  | 'ENROLLMENT_EXPIRED'
  | 'PIN_RESET'

export type AuditTargetType = 'user' | 'course' | 'courseVersion' | 'enrollment' | 'attempt' | 'certificate'

export interface AuditLogDocument {
  logId: string
  timestamp: Date
  userId: string
  action: AuditAction
  targetId: string
  targetType: AuditTargetType
  metadata: Record<string, unknown>
  sessionId: string
  ipAddress?: string
}

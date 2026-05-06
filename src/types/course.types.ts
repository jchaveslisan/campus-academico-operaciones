import { Department } from './user.types'

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  questionId: string
  text: string
  options: QuizOption[]
  correctId: string
  points: number
}

export interface CourseDocument {
  courseId: string
  title: string
  description: string
  department: Department[]
  currentVersion: number
  latestVersionId: string
  isActive: boolean
  createdBy: string
  createdAt: Date
  tags: string[]
  // Recertification
  validityDays: number // e.g. 180 for 6 months, 365 for 1 year
}

export interface CourseVersionDocument {
  versionId: string
  courseId: string
  versionNumber: number
  changeLog: string
  videoUrl: string
  documentUrl: string
  questions: QuizQuestion[]
  isActive: boolean
  publishedBy: string
  publishedAt: Date
  deprecatedAt: Date | null
}

export interface CreateCoursePayload {
  title: string
  description: string
  department: Department[]
  tags: string[]
  validityDays: number
  videoUrl: string
  documentUrl: string
  questions: Omit<QuizQuestion, 'questionId'>[]
  changeLog: string
}

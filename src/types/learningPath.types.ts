import { EnrollmentStatus } from "./enrollment.types"

export interface LearningPath {
  id: string
  title: string
  description: string
  courseIds: string[] // IDs of courses included in this path
  createdAt: Date
  updatedAt: Date
}

export interface LearningPathAssignment {
  id: string
  pathId: string
  userId: string
  assignedAt: Date
  assignedBy: string
  status: 'in_progress' | 'completed'
  progress: number // Percentage 0-100
}

export interface LearningPathProgressReport {
  userId: string
  userName: string
  pathTitle: string
  completedCourses: number
  totalCourses: number
  progress: number
  coursesStatus: Array<{
    courseId: string
    courseTitle: string
    status: EnrollmentStatus | 'not_assigned'
  }>
}

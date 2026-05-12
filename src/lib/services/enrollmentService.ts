import { db } from '@/lib/firebase/client'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { EnrollmentDocument, AttemptDocument, EnrollmentStatus } from '@/types/enrollment.types'
import { CourseDocument } from '@/types/course.types'

export async function getMyEnrollments(userId: string): Promise<EnrollmentDocument[]> {
  const q = query(
    collection(db, 'enrollments'),
    where('userId', '==', userId)
    // orderBy removed to avoid index requirement
  )
  const snap = await getDocs(q)
  // Sort in memory instead
  return snap.docs
    .map((d) => ({ ...(d.data() as EnrollmentDocument), enrollmentId: d.id }))
    .sort((a, b) => {
      const dateA = (a.assignedAt as any).toMillis?.() || new Date(a.assignedAt).getTime()
      const dateB = (b.assignedAt as any).toMillis?.() || new Date(b.assignedAt).getTime()
      return dateB - dateA
    })
}

export async function getAllEnrollments(): Promise<EnrollmentDocument[]> {
  const q = query(collection(db, 'enrollments'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as EnrollmentDocument), enrollmentId: d.id }))
}

export async function getEnrollmentById(enrollmentId: string): Promise<EnrollmentDocument | null> {
  const snap = await getDoc(doc(db, 'enrollments', enrollmentId))
  if (!snap.exists()) return null
  return { ...(snap.data() as EnrollmentDocument), enrollmentId: snap.id }
}

export async function assignCourse(
  userId: string,
  courseId: string,
  versionId: string,
  versionNumber: number,
  assignedBy: string,
  dueDate: Date | null = null
): Promise<string> {
  // Check if there is an active (not closed) enrollment for this user/course
  const q = query(
    collection(db, 'enrollments'),
    where('userId', '==', userId),
    where('courseId', '==', courseId),
    where('status', 'in', ['pending', 'in_progress'])
  )
  
  const existingSnap = await getDocs(q)
  if (!existingSnap.empty) {
    throw new Error('El colaborador ya tiene esta capacitación asignada y activa.')
  }

  const ref = await addDoc(collection(db, 'enrollments'), {
    userId,
    courseId,
    versionId,
    versionNumber,
    status: 'pending' as EnrollmentStatus,
    assignedBy,
    assignedAt: Timestamp.now(),
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
    expiresAt: null,
    attempts: 0,
    lastAttemptAt: null,
  })
  return ref.id
}

export async function recordVideoClick(enrollmentId: string, userId: string, courseId: string, versionId: string): Promise<string> {
  // Update enrollment status to in_progress
  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    status: 'in_progress',
  })

  // Create a new attempt doc
  const attemptRef = await addDoc(collection(db, 'attempts'), {
    enrollmentId,
    userId,
    courseId,
    versionId,
    attemptNumber: 0, // will patch below
    videoClickedAt: Timestamp.now(),
    videoConfirmedAt: null,
    quizStartedAt: null,
    quizSubmittedAt: null,
    answers: [],
    score: 0,
    totalQuestions: 5,
    passed: false,
    ipAddress: '',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
  })

  return attemptRef.id
}

export async function confirmVideoWatched(attemptId: string): Promise<void> {
  await updateDoc(doc(db, 'attempts', attemptId), {
    videoConfirmedAt: Timestamp.now(),
  })
}

export async function submitQuiz(
  enrollmentId: string,
  attemptId: string,
  answers: { questionId: string; selectedId: string; isCorrect: boolean }[],
  course: CourseDocument
): Promise<{ passed: boolean; score: number }> {
  const score = answers.filter((a) => a.isCorrect).length
  const totalQuestions = answers.length
  const passed = totalQuestions > 0 ? (score / totalQuestions) >= 0.8 : false
  const now = Timestamp.now()

  // Update attempt
  await updateDoc(doc(db, 'attempts', attemptId), {
    quizSubmittedAt: now,
    answers,
    score,
    passed,
  })

  // Update enrollment
  const expiresAt = passed
    ? Timestamp.fromMillis(now.toMillis() + course.validityDays * 24 * 60 * 60 * 1000)
    : null

  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    status: passed ? 'passed' : 'failed',
    lastAttemptAt: now,
    expiresAt,
    attempts: (await getEnrollmentById(enrollmentId))!.attempts + 1,
  })

  return { passed, score }
}

export async function addDoubt(enrollmentId: string, doubt: { id: string; userId: string; userName: string; message: string; isReply: boolean }): Promise<void> {
  const snap = await getDoc(doc(db, 'enrollments', enrollmentId))
  if (!snap.exists()) return
  
  const currentDoubts = snap.data().doubts || []
  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    doubts: [...currentDoubts, { ...doubt, timestamp: Timestamp.now() }],
    isDoubtsResolved: false // Reset resolution if a new doubt is added
  })
}

export async function resolveDoubts(enrollmentId: string, resolved: boolean): Promise<void> {
  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    isDoubtsResolved: resolved
  })
}

export async function resetFailedEnrollment(enrollmentId: string, newVersionId: string, newVersionNumber: number): Promise<void> {
  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    status: 'pending',
    versionId: newVersionId,
    versionNumber: newVersionNumber,
  })
}

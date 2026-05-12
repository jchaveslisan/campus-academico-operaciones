import { db } from '@/lib/firebase/client'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { LearningPath, LearningPathAssignment } from '@/types/learningPath.types'
import { assignCourse, getMyEnrollments } from './enrollmentService'

export async function createLearningPath(path: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'learningPaths'), {
    ...path,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function getLearningPaths(): Promise<LearningPath[]> {
  const snap = await getDocs(collection(db, 'learningPaths'))
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: d.data().createdAt?.toDate(),
    updatedAt: d.data().updatedAt?.toDate()
  } as LearningPath))
}

export async function updateLearningPath(id: string, data: Partial<LearningPath>): Promise<void> {
  await updateDoc(doc(db, 'learningPaths', id), {
    ...data,
    updatedAt: Timestamp.now()
  })
}

export async function assignLearningPath(userId: string, path: LearningPath, assignedBy: string): Promise<void> {
  // 1. Create the path assignment record
  await addDoc(collection(db, 'learningPathAssignments'), {
    userId,
    pathId: path.id,
    pathTitle: path.title,
    assignedAt: Timestamp.now(),
    assignedBy,
    status: 'in_progress',
    progress: 0
  })

  // 2. Assign all individual courses in the path
  // Note: We'll use a simple loop. In production you might want to check for existing active enrollments
  // but our assignCourse already does that check now.
  for (const courseId of path.courseIds) {
    try {
      // We need to fetch course latest version info
      const courseSnap = await getDoc(doc(db, 'courses', courseId))
      if (!courseSnap.exists()) continue
      const c = courseSnap.data()
      
      await assignCourse(
        userId,
        courseId,
        c.latestVersionId,
        c.currentVersion,
        assignedBy
      )
    } catch (error) {
      console.log(`Course ${courseId} skipped (likely already active)`)
    }
  }
}

export async function getPathAssignments(userId: string): Promise<any[]> {
  const q = query(collection(db, 'learningPathAssignments'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    assignedAt: d.data().assignedAt?.toDate()
  }))
}

export async function updatePathProgress(userId: string, pathId: string): Promise<void> {
  const pathSnap = await getDoc(doc(db, 'learningPaths', pathId))
  if (!pathSnap.exists()) return
  const path = pathSnap.data() as LearningPath

  const enrollments = await getMyEnrollments(userId)
  const passedCoursesCount = path.courseIds.filter(cid => 
    enrollments.some(e => e.courseId === cid && e.status === 'passed')
  ).length

  const progress = Math.round((passedCoursesCount / path.courseIds.length) * 100)
  const status = progress === 100 ? 'completed' : 'in_progress'

  const q = query(
    collection(db, 'learningPathAssignments'), 
    where('userId', '==', userId), 
    where('pathId', '==', pathId)
  )
  const assignmentSnap = await getDocs(q)
  if (!assignmentSnap.empty) {
    await updateDoc(doc(db, 'learningPathAssignments', assignmentSnap.docs[0].id), {
      progress,
      status,
      updatedAt: Timestamp.now()
    })
  }
}

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
import { CourseDocument, CourseVersionDocument, CreateCoursePayload } from '@/types/course.types'
import { v4 as uuidv4 } from 'uuid'

export async function getCourseById(courseId: string): Promise<CourseDocument | null> {
  const snap = await getDoc(doc(db, 'courses', courseId))
  if (!snap.exists()) return null
  return { ...(snap.data() as CourseDocument), courseId: snap.id }
}

export async function getActiveCourses(): Promise<CourseDocument[]> {
  const q = query(collection(db, 'courses'), where('isActive', '==', true))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...(d.data() as CourseDocument), courseId: d.id }))
}

export async function getCourseVersion(versionId: string): Promise<CourseVersionDocument | null> {
  const snap = await getDoc(doc(db, 'courseVersions', versionId))
  if (!snap.exists()) return null
  return { ...(snap.data() as CourseVersionDocument), versionId: snap.id }
}

export async function getCourseVersionHistory(courseId: string): Promise<CourseVersionDocument[]> {
  const q = query(
    collection(db, 'courseVersions'),
    where('courseId', '==', courseId)
    // orderBy removed to avoid index requirement
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ ...(d.data() as CourseVersionDocument), versionId: d.id }))
    .sort((a, b) => b.versionNumber - a.versionNumber)
}

export async function createCourseWithVersion(
  payload: CreateCoursePayload,
  publishedBy: string
): Promise<{ courseId: string; versionId: string }> {
  // 1. Create version doc first (need its ID)
  const versionRef = await addDoc(collection(db, 'courseVersions'), {
    courseId: '', // will update below
    versionNumber: 1,
    changeLog: payload.changeLog,
    videoUrl: payload.videoUrl,
    documentUrl: payload.documentUrl,
    questions: payload.questions.map((q) => ({ ...q, questionId: uuidv4() })),
    isActive: true,
    publishedBy,
    publishedAt: Timestamp.now(),
    deprecatedAt: null,
  })

  // 2. Create course doc referencing the version
  const courseRef = await addDoc(collection(db, 'courses'), {
    title: payload.title,
    description: payload.description,
    department: payload.department,
    currentVersion: 1,
    latestVersionId: versionRef.id,
    isActive: true,
    createdBy: publishedBy,
    createdAt: Timestamp.now(),
    tags: payload.tags,
    validityDays: payload.validityDays,
  })

  // 3. Patch courseId into the version doc
  await updateDoc(versionRef, { courseId: courseRef.id })

  return { courseId: courseRef.id, versionId: versionRef.id }
}

export async function publishNewVersion(
  courseId: string,
  payload: Omit<CreateCoursePayload, 'title' | 'description' | 'department' | 'tags' | 'validityDays'>,
  publishedBy: string
): Promise<string> {
  const courseSnap = await getDoc(doc(db, 'courses', courseId))
  if (!courseSnap.exists()) throw new Error('Course not found')
  const course = courseSnap.data() as CourseDocument
  const newVersionNumber = course.currentVersion + 1

  // Deprecate old active version
  await updateDoc(doc(db, 'courseVersions', course.latestVersionId), {
    isActive: false,
    deprecatedAt: Timestamp.now(),
  })

  // Create new version
  const versionRef = await addDoc(collection(db, 'courseVersions'), {
    courseId,
    versionNumber: newVersionNumber,
    changeLog: payload.changeLog,
    videoUrl: payload.videoUrl,
    documentUrl: payload.documentUrl,
    questions: payload.questions.map((q) => ({ ...q, questionId: uuidv4() })),
    isActive: true,
    publishedBy,
    publishedAt: Timestamp.now(),
    deprecatedAt: null,
  })

  // Update course master
  await updateDoc(doc(db, 'courses', courseId), {
    currentVersion: newVersionNumber,
    latestVersionId: versionRef.id,
  })

  return versionRef.id
}

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { displayName, cedula, email, department, role, puesto, pin, createdBy } = await req.json()

    if (!displayName || !cedula || !department || !role || !puesto || !pin) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    if (role === 'jefatura' && !email) {
      return Response.json({ error: 'El correo es obligatorio para Jefaturas' }, { status: 400 })
    }

    // Usar correo proporcionado o generar uno ficticio para colaboradores
    const finalEmail = email || `${cedula}@campus.local`

    // Verify requester is jefatura via their token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    const requesterSnap = await adminDb.collection('users').doc(decoded.uid).get()
    if (!requesterSnap.exists || requesterSnap.data()?.role !== 'jefatura') {
      return Response.json({ error: 'No autorizado — solo jefaturas pueden crear usuarios' }, { status: 403 })
    }

    // Check cedula uniqueness
    const existing = await adminDb.collection('users').where('cedula', '==', cedula).limit(1).get()
    if (!existing.empty) {
      return Response.json({ error: 'Ya existe un usuario con esa cédula' }, { status: 409 })
    }

    // Create Firebase Auth user
    const authUser = await adminAuth.createUser({ email: finalEmail, displayName })

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, 10)

    // Create Firestore document
    await adminDb.collection('users').doc(authUser.uid).set({
      uid: authUser.uid,
      displayName,
      cedula,
      email: finalEmail,
      department,
      role,
      puesto,
      pinHash,
      isActive: true,
      failedPinAttempts: 0,
      pinLockedUntil: null,
      createdAt: new Date(),
      createdBy,
      lastLoginAt: null,
    })

    // Audit log
    await adminDb.collection('auditLog').add({
      userId: createdBy,
      action: 'USER_CREATED',
      targetId: authUser.uid,
      targetType: 'user',
      timestamp: new Date(),
      metadata: { cedula, role, department },
      sessionId: '',
    })

    return Response.json({ uid: authUser.uid, message: 'Usuario creado exitosamente' })
  } catch (error) {
    console.error('[create-user]', error)
    return Response.json({ error: 'Error creando usuario' }, { status: 500 })
  }
}

// Reset PIN — jefatura only
export async function PATCH(req: Request) {
  try {
    const { targetUid, newPin } = await req.json()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    const requesterSnap = await adminDb.collection('users').doc(decoded.uid).get()
    if (!requesterSnap.exists || requesterSnap.data()?.role !== 'jefatura') {
      return Response.json({ error: 'No autorizado' }, { status: 403 })
    }

    const pinHash = await bcrypt.hash(newPin, 10)
    await adminDb.collection('users').doc(targetUid).update({
      pinHash,
      failedPinAttempts: 0,
      pinLockedUntil: null,
    })

    await adminDb.collection('auditLog').add({
      userId: decoded.uid,
      action: 'PIN_RESET',
      targetId: targetUid,
      targetType: 'user',
      timestamp: new Date(),
      metadata: {},
      sessionId: '',
    })

    return Response.json({ message: 'PIN actualizado exitosamente' })
  } catch (error) {
    console.error('[create-user PATCH]', error)
    return Response.json({ error: 'Error actualizando PIN' }, { status: 500 })
  }
}

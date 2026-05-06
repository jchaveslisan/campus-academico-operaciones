import { adminAuth, adminDb } from '@/lib/firebase/admin'
import bcrypt from 'bcryptjs'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: Request) {
  try {
    const { cedula, pin } = await req.json()

    if (!cedula || !pin) {
      return Response.json({ error: 'Cédula y PIN son requeridos' }, { status: 400 })
    }

    if (pin.length < 4 || pin.length > 6) {
      return Response.json({ error: 'PIN inválido' }, { status: 400 })
    }

    // 1. Find user by cedula
    const snapshot = await adminDb
      .collection('users')
      .where('cedula', '==', cedula)
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return Response.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const userDoc = snapshot.docs[0]
    const userData = userDoc.data()

    // 2. Check temporary lock
    if (userData.pinLockedUntil) {
      const lockedUntil = userData.pinLockedUntil.toDate()
      if (lockedUntil > new Date()) {
        const remainingMs = lockedUntil.getTime() - Date.now()
        const remainingMin = Math.ceil(remainingMs / 60000)
        return Response.json(
          { error: `Cuenta bloqueada. Intente en ${remainingMin} minuto(s)` },
          { status: 429 }
        )
      }
    }

    // 3. Verify PIN hash
    const isValid = await bcrypt.compare(pin, userData.pinHash)

    if (!isValid) {
      const attempts = (userData.failedPinAttempts || 0) + 1
      const shouldLock = attempts >= 5
      const lockUntil = shouldLock
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null

      await userDoc.ref.update({
        failedPinAttempts: attempts,
        pinLockedUntil: lockUntil,
      })

      // Audit log
      await adminDb.collection('auditLog').add({
        userId: userData.uid,
        action: 'PIN_LOGIN_FAILED',
        targetId: userData.uid,
        targetType: 'user',
        timestamp: new Date(),
        metadata: { attempt: attempts, locked: shouldLock },
        sessionId: '',
        ipAddress: req.headers.get('x-forwarded-for') ?? '',
      })

      const message = shouldLock
        ? 'Demasiados intentos. Cuenta bloqueada por 15 minutos'
        : 'Credenciales inválidas'

      return Response.json({ error: message }, { status: 401 })
    }

    // 4. Issue Firebase Custom Token
    const customToken = await adminAuth.createCustomToken(userDoc.id, {
      role: userData.role,
      department: userData.department,
    })

    // 5. Reset failed attempts + update lastLogin
    await userDoc.ref.update({
      failedPinAttempts: 0,
      pinLockedUntil: null,
      lastLoginAt: new Date(),
    })

    // 6. Audit log — success
    await adminDb.collection('auditLog').add({
      userId: userDoc.id,
      action: 'PIN_LOGIN_SUCCESS',
      targetId: userDoc.id,
      targetType: 'user',
      timestamp: new Date(),
      metadata: {},
      sessionId: '',
      ipAddress: req.headers.get('x-forwarded-for') ?? '',
    })

    return Response.json({ customToken, role: userData.role })
  } catch (error) {
    console.error('[verify-pin]', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

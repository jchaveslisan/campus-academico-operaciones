import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { CertificateDocument } from '@/types/enrollment.types'

export async function generateCertificatePDF(cert: CertificateDocument) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── BACKGROUND & BORDER ──
  doc.setFillColor(248, 250, 252) // slate-50
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  
  doc.setDrawColor(79, 70, 229) // indigo-600
  doc.setLineWidth(1.5)
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20)
  
  doc.setLineWidth(0.5)
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24)

  // ── HEADER ──
  doc.setTextColor(30, 27, 75) // indigo-950
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('CERTIFICADO DE CAPACITACIÓN', pageWidth / 2, 40, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text('ESTE DOCUMENTO ACREDITA QUE', pageWidth / 2, 55, { align: 'center' })

  // ── USER NAME ──
  doc.setTextColor(79, 70, 229) // indigo-600
  doc.setFontSize(36)
  doc.setFont('helvetica', 'bold')
  doc.text(cert.userName.toUpperCase(), pageWidth / 2, 75, { align: 'center' })

  // ── DETAILS ──
  doc.setTextColor(30, 27, 75)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Cédula: ${cert.userCedula}  |  Puesto: ${cert.userPuesto}`, pageWidth / 2, 85, { align: 'center' })
  doc.text(`Departamento: ${cert.userDepartment.toUpperCase()}`, pageWidth / 2, 92, { align: 'center' })

  doc.setDrawColor(226, 232, 240) // slate-200
  doc.line(60, 100, pageWidth - 60, 100)

  // ── COURSE INFO ──
  doc.setTextColor(100, 116, 139)
  doc.text('HA COMPLETADO SATISFACTORIAMENTE EL CURSO:', pageWidth / 2, 115, { align: 'center' })

  doc.setTextColor(30, 27, 75)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(cert.courseName, pageWidth / 2, 128, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Versión del Procedimiento: ${cert.versionNumber}.0`, pageWidth / 2, 135, { align: 'center' })

  // ── DATES & SCORE ──
  doc.setFontSize(11)
  doc.text(`Fecha de Emisión: ${new Date(cert.issuedAt).toLocaleDateString('es-CR')}`, 40, 160)
  const expiryText = cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('es-CR') : 'PERMANENTE / NO VENCE'
  doc.text(`Vence: ${expiryText}`, 40, 168)
  doc.text(`Puntaje obtenido: ${cert.score} de 5 (80%)`, 40, 176)

  // ── QR CODE ──
  const verifyUrl = `${window.location.origin}/verify/${cert.certificateId}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 100 })
  doc.addImage(qrDataUrl, 'PNG', pageWidth - 70, 145, 35, 35)
  
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Escanee para verificar autenticidad', pageWidth - 52.5, 184, { align: 'center' })
  doc.text(`ID: ${cert.certificateId}`, pageWidth - 52.5, 188, { align: 'center' })

  // ── SIGNATURE PLACEHOLDERS ──
  doc.setDrawColor(30, 27, 75)
  doc.line(40, 180, 100, 180)
  doc.text('Firma del Colaborador', 70, 186, { align: 'center' })

  // ── FOOTER ──
  doc.setFontSize(9)
  doc.text('Campus Académico - Departamento de Operaciones - Industria Farmacéutica', pageWidth / 2, 198, { align: 'center' })

  doc.save(`Certificado_${cert.userName.replace(/\s+/g, '_')}_${cert.courseName.replace(/\s+/g, '_')}.pdf`)
}

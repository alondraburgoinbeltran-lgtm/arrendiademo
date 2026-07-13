import { jsPDF } from 'jspdf'
import type { Rent } from '@/types'
import { formatMonthYear } from '@/lib/utils'

const ARRENDADOR   = 'Tu nombre aquí'
const CARGO        = 'Administrador'

const NAVY  = [15,  31, 92]  as [number,number,number]
const BLUE  = [157, 204, 255] as [number,number,number]
const DARK  = [51,  65,  85] as [number,number,number]
const LIGHT = [226, 232, 240] as [number,number,number]
const WHITE = [255, 255, 255] as [number,number,number]
const GRAY  = [100, 116, 139] as [number,number,number]
const INK   = [15,  23,  42] as [number,number,number]
const LGRAY = [245, 247, 250] as [number,number,number]

function currency(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function numeroALetras(num: number): string {
  const u = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve']
  const e = ['diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve']
  const d = ['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa']
  const c = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos']
  if (num === 0)    return 'cero'
  if (num === 100)  return 'cien'
  if (num === 1000) return 'mil'
  let r = ''
  if (num >= 1000) { const m = Math.floor(num/1000); r += (m===1?'mil ':numeroALetras(m)+' mil '); num %= 1000 }
  if (num >= 100)  { r += c[Math.floor(num/100)]+' '; num %= 100 }
  if (num >= 20)   { const dd=Math.floor(num/10),uu=num%10; r += uu===0?d[dd]:d[dd]+' y '+u[uu] }
  else if (num>=10){ r += e[num-10] }
  else if (num>0)  { r += u[num] }
  return r.trim()
}

function montoEnLetras(monto: number): string {
  const entero   = Math.floor(monto)
  const centavos = Math.round((monto - entero) * 100)
  const letras   = numeroALetras(entero)
  return `${letras.charAt(0).toUpperCase()}${letras.slice(1)} ${String(centavos).padStart(2,'0')}/100 M.N.`
}

export function generateReceiptPDF(rent: Rent, logoBase64: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })

  const W        = 215.9
  const H        = 279.4
  const ML       = 18
  const CW       = W - ML - ML   // 179.9mm

  // ── Layout constants — calibrated to fit letter page ─────────
  // Total budget: 279.4 - 12(footer) - 28(firma zone) = 239.4mm
  // Header: ~52mm | Content: ~162mm | Total: ~214mm (25mm margen)
  const ROW_H      = 6      // altura total de cada fila de datos
  const TXT_OFF    = 3.0    // baseline del texto dentro del row (centrado visual)
  const LINE_OFF   = 5.0    // posición de la línea separadora dentro del row
  const SECTION_H  = 5      // altura del banner de sección
  const SEC_TXT    = 3.3    // baseline del texto dentro del banner
  const TH_H       = 5.5    // altura sub-header de tabla
  const TOT_H      = 6.5    // altura fila total
  const MONTO_H    = 18     // altura caja monto
  const FOOTER_H   = 8
  const FIRMA_H    = 28     // zona firma reservada desde el fondo
  const FIRMA_Y    = H - FOOTER_H - FIRMA_H  // 239.4mm — posición absoluta inicio firma

  // ── Datos ─────────────────────────────────────────────────────
  const propNum   = rent.property_number
  const propLabel = `${rent.property_name}${propNum ? ' #'+propNum : ''}`
  const propAddr  = (rent as any).property_address as string | null ?? ''
 const receiptFolio = `AR-${rent.year}-${String(rent.month).padStart(2, '0')}`
  const fecha     = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' })
  const periodo   = formatMonthYear(rent.month, rent.year)
  const total     = rent.amount + (rent.maintenance??0) + (rent.services_amount??0) + (rent.other_charges??0)

  let y = 0

  // ════════════════════════════════════════════════════════════
  //  HEADER — compacto
  // ════════════════════════════════════════════════════════════

  // Barra navy top
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 6, 'F')
  y = 8

  // Logo centrado
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', W/2-11, y, 22, 22) } catch {}
  }
  y += 25

  // Subtítulo centrado
  doc.setFont('helvetica','normal').setFontSize(8).setTextColor(...GRAY)
  doc.text('Administracion Inteligente de Arrendamientos', W/2, y, { align:'center' })
  y += 5

  // Línea decorativa centrada
  doc.setDrawColor(...BLUE).setLineWidth(0.4)
  doc.line(ML + CW*0.3, y, ML + CW*0.7, y)
  y += 4

  // Badge título
  doc.setFillColor(...NAVY)
  doc.roundedRect(ML + CW*0.15, y, CW*0.7, 7, 1.5, 1.5, 'F')
  doc.setFont('helvetica','bold').setFontSize(8.5).setTextColor(...WHITE)
  doc.text('RECIBO DE ARRENDAMIENTO', W/2, y+4.8, { align:'center' })
  y += 10

  // Folio / Fecha
  doc.setFillColor(...LIGHT)
  doc.rect(ML, y, CW, 11, 'F')
  doc.setFont('helvetica','normal').setFontSize(6.5).setTextColor(...GRAY)
  doc.text('receiptFolio:', ML+3, y+3.5)
  doc.text('Fecha de emision:', ML+CW-3, y+3.5, { align:'right' })
  doc.setFont('helvetica','bold').setFontSize(8.5).setTextColor(...NAVY)
  doc.text(receiptFolio, ML+3, y+9)
  doc.text(fecha, ML+CW-3, y+9, { align:'right' })
  y += 14

  // ════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════

  function sectionHeader(title: string) {
    doc.setFillColor(...NAVY)
    doc.rect(ML, y, CW, SECTION_H, 'F')
    doc.setFont('helvetica','bold').setFontSize(7).setTextColor(...WHITE)
    doc.text(title.toUpperCase(), ML+3, y+SEC_TXT)
    y += SECTION_H
  }

  function fieldRow(label: string, value: string) {
    doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(...GRAY)
    doc.text(label, ML+3, y+TXT_OFF)
    doc.setFont('helvetica','bold').setFontSize(7.5).setTextColor(...INK)
    doc.text(value, ML+58, y+TXT_OFF)
    doc.setDrawColor(...LIGHT).setLineWidth(0.15)
    doc.line(ML, y+LINE_OFF, ML+CW, y+LINE_OFF)
    y += ROW_H
  }

  // ════════════════════════════════════════════════════════════
  //  SECCIÓN 1 — DATOS DEL INMUEBLE
  // ════════════════════════════════════════════════════════════
  sectionHeader('Datos del inmueble')
  fieldRow('Propiedad', propLabel)
  if (propAddr) fieldRow('Direccion', propAddr)
  y += 2

  // ════════════════════════════════════════════════════════════
  //  MONTO
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY)
  doc.roundedRect(ML, y, CW, MONTO_H, 2, 2, 'F')
  doc.setFont('helvetica','normal').setFontSize(7).setTextColor(...BLUE)
  doc.text('MONTO PAGADO', W/2, y+5, { align:'center' })
  doc.setFont('helvetica','bold').setFontSize(20).setTextColor(...WHITE)
  doc.text(currency(total), W/2, y+13, { align:'center' })
  doc.setFont('helvetica','italic').setFontSize(6.5).setTextColor(...BLUE)
  doc.text('( '+montoEnLetras(total)+' )', W/2, y+17, { align:'center' })
  y += MONTO_H + 3

  // ════════════════════════════════════════════════════════════
  //  SECCIÓN 2 — CONCEPTO
  // ════════════════════════════════════════════════════════════
  sectionHeader('Concepto del pago')
  fieldRow('Recibi de', rent.tenant_name ?? '—')
  fieldRow('Por concepto de', 'Pago de arrendamiento')
  fieldRow('Periodo', periodo)
  y += 2

  // ════════════════════════════════════════════════════════════
  //  SECCIÓN 3 — DETALLE
  // ════════════════════════════════════════════════════════════
  sectionHeader('Detalle del pago')

  // Sub-header tabla
  doc.setFillColor(...LGRAY)
  doc.rect(ML, y, CW, TH_H, 'F')
  doc.setFont('helvetica','bold').setFontSize(7).setTextColor(...DARK)
  doc.text('Concepto', ML+3, y+TH_H/2+1.2)
  doc.text('Importe', ML+CW-3, y+TH_H/2+1.2, { align:'right' })
  y += TH_H

  function tableRow(label: string, amount: number|null) {
    const show = amount !== null && amount > 0
    doc.setFont('helvetica','normal').setFontSize(7.5)
    doc.setTextColor(show ? INK[0] : GRAY[0], show ? INK[1] : GRAY[1], show ? INK[2] : GRAY[2])
    doc.text(label, ML+3, y+TXT_OFF)
    doc.text(show ? currency(amount!) : '—', ML+CW-3, y+TXT_OFF, { align:'right' })
    doc.setDrawColor(...LIGHT).setLineWidth(0.15)
    doc.line(ML, y+LINE_OFF, ML+CW, y+LINE_OFF)
    y += ROW_H
  }

  tableRow('Renta mensual', rent.amount)
  tableRow('Mantenimiento', rent.maintenance ?? 0)
  tableRow('Servicios', rent.services_amount ?? 0)
  tableRow('Otros cargos', rent.other_charges ?? 0)

  // Fila TOTAL
  doc.setFillColor(...LGRAY)
  doc.rect(ML, y, CW, TOT_H, 'F')
  doc.setFont('helvetica','bold').setFontSize(8).setTextColor(...NAVY)
  doc.text('TOTAL PAGADO', ML+3, y+TOT_H/2+1.3)
  doc.text(currency(total), ML+CW-3, y+TOT_H/2+1.3, { align:'right' })
  y += TOT_H + 3

  // ════════════════════════════════════════════════════════════
  //  SECCIÓN 4 — MÉTODO DE PAGO
  // ════════════════════════════════════════════════════════════
  sectionHeader('Metodo de pago')
  const metodo = rent.payment_method
    ? rent.payment_method.charAt(0).toUpperCase() + rent.payment_method.slice(1)
    : '—'
  fieldRow('Forma de pago', metodo)
  if (rent.payment_method === 'transferencia' && rent.bank_account) {
    fieldRow('Banco receptor', rent.bank_account.toUpperCase())
  }
  if ((rent as any).bank_reference) {
    fieldRow('Referencia', (rent as any).bank_reference)
  }
  fieldRow('Fecha de pago', rent.paid_at
    ? new Date(rent.paid_at+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'})
    : '—')
  y += 2

  // ════════════════════════════════════════════════════════════
  //  SECCIÓN 5 — OBSERVACIONES
  // ════════════════════════════════════════════════════════════
  sectionHeader('Observaciones')
  if (rent.comment) {
    doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(...INK)
    const lines = doc.splitTextToSize(rent.comment, CW-6)
    doc.text(lines, ML+3, y+TXT_OFF)
    y += Math.min(lines.length, 2) * ROW_H
  } else {
    doc.setDrawColor(...LIGHT).setLineWidth(0.2)
    doc.line(ML, y+LINE_OFF, ML+CW, y+LINE_OFF)
    y += ROW_H
  }
  y += 2

  // ════════════════════════════════════════════════════════════
  //  DECLARACIÓN LEGAL
  // ════════════════════════════════════════════════════════════
  const DECL_H = 9
  doc.setFillColor(...LGRAY)
  doc.roundedRect(ML, y, CW, DECL_H, 1, 1, 'F')
  doc.setDrawColor(...LIGHT).setLineWidth(0.2)
  doc.roundedRect(ML, y, CW, DECL_H, 1, 1, 'S')
  const decl = 'El presente recibo acredita la recepcion del pago correspondiente al arrendamiento del inmueble señalado, por el periodo indicado.'
  doc.setFont('helvetica','normal').setFontSize(6.5).setTextColor(...GRAY)
  const declLines = doc.splitTextToSize(decl, CW-10)
  doc.text(declLines, W/2, y + (DECL_H - declLines.length*3)/2 + 3.5, { align:'center' })
  y += DECL_H + 3

  // ════════════════════════════════════════════════════════════
  //  FIRMA — posición ABSOLUTA garantizada
  //  sigY = la mayor entre (y acumulado + 2) y el mínimo garantizado
  // ════════════════════════════════════════════════════════════
 const sigY = Math.min(Math.max(y - 8, FIRMA_Y - 12), H - FOOTER_H - FIRMA_H - 8)

  // Placeholder de firma digital — recuadro punteado con texto instructivo
  const SIG_W    = 52
  const SIG_IMG_H = 15
  const SIG_X    = W/2 - SIG_W/2   // ancla centrado
  doc.setDrawColor(...LIGHT).setLineWidth(0.3)
  doc.setLineDashPattern([1, 1], 0)
  doc.roundedRect(SIG_X, sigY, SIG_W, SIG_IMG_H, 1, 1, 'S')
  doc.setLineDashPattern([], 0) // reset — que las líneas siguientes sean sólidas
  doc.setFont('helvetica', 'normal').setFontSize(5.5).setTextColor(...GRAY)
  doc.text('INSERTA AQUÍ TU FIRMA DIGITAL', SIG_X + SIG_W / 2, sigY + SIG_IMG_H / 2 + 1, { align: 'center' })

  // Línea centrada
  const lineY = sigY + SIG_IMG_H + 1.5
  doc.setDrawColor(...DARK).setLineWidth(0.4)
  doc.line(SIG_X, lineY, SIG_X + SIG_W, lineY)

  // Nombre centrado
  doc.setFont('helvetica','bold').setFontSize(7.5).setTextColor(...NAVY)
  doc.text(ARRENDADOR, W/2, lineY+4.5, { align:'center' })

  // Cargo centrado
  doc.setFont('helvetica','normal').setFontSize(7).setTextColor(...GRAY)
  doc.text(CARGO, W/2, lineY+8.5, { align:'center' })

 // ═══════════════════════════════════════════════════════
// FOOTER PREMIUM ARRENDIA
// ═══════════════════════════════════════════════════════

const footerY = H - 18

doc.setFillColor(8,24,92)
doc.roundedRect(0, footerY, W, 18, 0, 0, 'F')


// Logo ARRENDIA

doc.setFont('helvetica','bold')
doc.setFontSize(11)
doc.setTextColor(255,255,255)

doc.text('ARRENDIA', 12, footerY+7)

doc.setFont('helvetica','normal')
doc.setFontSize(6.5)

doc.setTextColor(157,204,255)

doc.text(
'Administración Inteligente de Arrendamientos',
12,
footerY+11
)


// Línea divisoria

doc.setDrawColor(157,204,255)
doc.setLineWidth(.2)

doc.line(82, footerY+4, 82, footerY+14)


// Escudo

doc.setDrawColor(157,204,255)

doc.circle(92, footerY+9, 2.5)

doc.line(91, footerY+9, 92, footerY+10)

doc.line(92, footerY+10, 94, footerY+7)


// Leyenda

doc.setFont('helvetica','normal')

doc.setFontSize(7)

doc.setTextColor(255,255,255)

doc.text(
'Este documento es un comprobante',
100,
footerY+7
)

doc.text(
'administrativo y no sustituye una factura fiscal.',
100,
footerY+11
)


// Ondas decorativas compatibles con jsPDF
doc.setDrawColor(0, 90, 255)
doc.setLineWidth(0.2)

for (let i = 0; i < 5; i++) {
  const offset = i * 3
  doc.line(W - 22 + offset, footerY + 4, W - 8 + offset, footerY + 18)
}
  const fname = `recibo-${propLabel.replace(/\s+/g,'-').replace(/#/g,'')}-${rent.month}-${rent.year}.pdf`
  doc.save(fname)
}


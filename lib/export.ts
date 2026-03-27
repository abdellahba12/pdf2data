import ExcelJS from 'exceljs'
import { ExtractedInvoiceData } from './ai'

export async function generateExcel(data: ExtractedInvoiceData, fileName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PDF2Data'
  workbook.created = new Date()

  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 40 },
  ]
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } }

  const summaryData = [
    { field: 'Vendor Name', value: data.vendor_name || '' },
    { field: 'Client Name', value: data.client_name || '' },
    { field: 'Invoice Number', value: data.invoice_number || '' },
    { field: 'Invoice Date', value: data.invoice_date || '' },
    { field: 'Due Date', value: data.due_date || '' },
    { field: 'Currency', value: data.currency || '' },
    { field: 'Tax Amount', value: data.tax_amount ?? '' },
    { field: 'Total Amount', value: data.total_amount ?? '' },
  ]
  summaryData.forEach((row) => summarySheet.addRow(row))
  summarySheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4F2' } }
    }
  })

  const itemsSheet = workbook.addWorksheet('Line Items')
  itemsSheet.columns = [
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit Price', key: 'unit_price', width: 15 },
    { header: 'Total', key: 'total', width: 15 },
  ]
  itemsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  itemsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } }

  if (data.line_items && data.line_items.length > 0) {
    data.line_items.forEach((item, index) => {
      const row = itemsSheet.addRow(item)
      if ((index + 2) % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F4F2' } }
      }
    })
    const totalRow = itemsSheet.addRow({
      description: 'TOTAL', quantity: null, unit_price: null,
      total: data.total_amount || data.line_items.reduce((sum, i) => sum + i.total, 0),
    })
    totalRow.font = { bold: true }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export function generateCSV(data: ExtractedInvoiceData): string {
  const lines: string[] = []
  lines.push('Field,Value')
  lines.push(`Vendor Name,${csvEscape(data.vendor_name || '')}`)
  lines.push(`Client Name,${csvEscape(data.client_name || '')}`)
  lines.push(`Invoice Number,${csvEscape(data.invoice_number || '')}`)
  lines.push(`Invoice Date,${csvEscape(data.invoice_date || '')}`)
  lines.push(`Due Date,${csvEscape(data.due_date || '')}`)
  lines.push(`Currency,${csvEscape(data.currency || '')}`)
  lines.push(`Tax Amount,${data.tax_amount ?? ''}`)
  lines.push(`Total Amount,${data.total_amount ?? ''}`)
  lines.push('')
  lines.push('Description,Quantity,Unit Price,Total')
  if (data.line_items) {
    data.line_items.forEach((item) => {
      lines.push(`${csvEscape(item.description)},${item.quantity},${item.unit_price},${item.total}`)
    })
  }
  return lines.join('\n')
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

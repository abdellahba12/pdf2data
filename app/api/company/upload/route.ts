import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { uploadFile } from '@/lib/storage'
import { analyzeInvoiceStyle } from '@/lib/style-analyzer'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const formData = await request.formData()
  const type = formData.get('type') as string
  const file = formData.get('file')
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const blob = file as Blob
  const originalName = (file as any).name || 'file.bin'

  const ALLOWED_LOGO_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
  const ALLOWED_TEMPLATE_EXTS = new Set(['pdf'])
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin'

  if (type === 'logo' && !ALLOWED_LOGO_EXTS.has(ext)) {
    return NextResponse.json({ error: 'Logo must be an image (png, jpg, jpeg, gif, webp)' }, { status: 400 })
  }
  if (type === 'template' && !ALLOWED_TEMPLATE_EXTS.has(ext)) {
    return NextResponse.json({ error: 'Template must be a PDF' }, { status: 400 })
  }

  const fileId = crypto.randomUUID()
  const fileName = `${type}-${session.userId}-${fileId}.${ext}`
  const buffer = Buffer.from(await blob.arrayBuffer())
  const contentType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`
  await uploadFile(buffer, fileName, contentType)

  if (type === 'logo') {
    const logoUrl = `/api/company/file/${fileName}`
    await prisma.user.update({ where: { id: session.userId }, data: { companyLogoUrl: logoUrl } })
    return NextResponse.json({ logoUrl })
  }

  if (type === 'template') {
    const templateUrl = `/api/company/file/${fileName}`
    // Write to temp for style analysis (reads from disk), then clean up
    const tmpPath = path.join(os.tmpdir(), `pdf2data-${fileName}`)
    fs.writeFileSync(tmpPath, buffer)
    try {
      const style = await analyzeInvoiceStyle(tmpPath)
      await prisma.user.update({
        where: { id: session.userId },
        data: { companyStyle: style as object, templateFileUrl: templateUrl },
      })
      return NextResponse.json({ style, templateUrl })
    } catch (error) {
      console.error('Style analysis error:', error)
      await prisma.user.update({ where: { id: session.userId }, data: { templateFileUrl: templateUrl } })
      return NextResponse.json({ error: 'Could not analyze invoice style', templateUrl }, { status: 500 })
    } finally {
      try { fs.unlinkSync(tmpPath) } catch {}
    }
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

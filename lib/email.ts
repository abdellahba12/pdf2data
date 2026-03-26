import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

const FROM = `PDF2Data <${process.env.SMTP_USER}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pdf2data.up.railway.app'

export async function sendWelcomeEmail(email: string, name?: string) {
  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'Bienvenido a PDF2Data',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <div style="background:#0f0e0d;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;font-size:22px;margin:0;">PDF2Data</h1>
        </div>
        <div style="background:#faf9f7;padding:32px;border:1px solid #e8e6e1;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:20px;margin-bottom:12px;">Bienvenido${name ? ', ' + name : ''}!</h2>
          <p style="color:#6e6860;line-height:1.7;margin-bottom:20px;">
            Tienes <strong>5 dias de prueba gratuita</strong> con acceso completo. Despues podras seguir con el plan gratuito (10 documentos) o actualizar a Pro.
          </p>
          <p style="color:#6e6860;line-height:1.7;margin-bottom:24px;">
            <strong>Primeros pasos:</strong><br/>
            1. Ve a <strong>Mi Empresa</strong> y configura tus datos<br/>
            2. Sube tu logo y una factura de ejemplo<br/>
            3. Sube tu primera factura de proveedor
          </p>
          <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0f0e0d;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
            Ir al dashboard
          </a>
        </div>
      </div>`,
  })
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/api/auth/verify?token=${token}`
  await transporter.sendMail({
    from: FROM, to: email,
    subject: 'Verifica tu correo - PDF2Data',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <div style="background:#0f0e0d;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;font-size:22px;margin:0;">PDF2Data</h1>
        </div>
        <div style="background:#faf9f7;padding:32px;border:1px solid #e8e6e1;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="font-size:20px;margin-bottom:12px;">Verifica tu correo electronico</h2>
          <p style="color:#6e6860;line-height:1.7;margin-bottom:24px;">Haz clic en el boton de abajo para verificar tu cuenta.</p>
          <a href="${link}" style="display:inline-block;background:#d97706;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Verificar email</a>
        </div>
      </div>`,
  })
}

export async function sendInvoiceEmail(
  toEmail: string, toName: string, fromCompany: string,
  invoiceNumber: string, invoiceHtml: string
) {
  await transporter.sendMail({
    from: FROM, to: toEmail,
    subject: `Factura ${invoiceNumber} de ${fromCompany}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
        <div style="background:#0f0e0d;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:white;font-size:22px;margin:0;">${fromCompany}</h1>
        </div>
        <div style="background:#faf9f7;padding:32px;border:1px solid #e8e6e1;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#6e6860;line-height:1.7;">
            Estimado/a ${toName},<br/><br/>
            Adjunto encontraras la factura <strong>${invoiceNumber}</strong>.
          </p>
          <p style="color:#6e6860;margin-top:24px;">Atentamente,<br/><strong>${fromCompany}</strong></p>
        </div>
      </div>`,
    attachments: [{ filename: `factura-${invoiceNumber}.html`, content: invoiceHtml, contentType: 'text/html' }],
  })
}

import nodemailer from 'nodemailer'
import type { MailPayload, MailSendResult } from './types'

let transporter: nodemailer.Transporter | null = null

function getSmtpTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const smtpPort = Number(process.env.SMTP_PORT) || 587
    const smtpSecure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : smtpPort === 465

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    })
  }

  return transporter
}

function withMailDefaults(options: nodemailer.SendMailOptions): nodemailer.SendMailOptions {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER
  const envelopeFrom = process.env.SMTP_USER || fromAddress

  return {
    ...options,
    from: fromAddress,
    envelope: {
      from: envelopeFrom,
      to: options.to as string,
    },
    headers: {
      ...(options.headers || {}),
      'List-Unsubscribe': `mailto:${envelopeFrom}`,
    },
  }
}

export async function sendViaSmtp(payload: MailPayload): Promise<MailSendResult> {
  const result = await getSmtpTransporter().sendMail(
    withMailDefaults({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    })
  )

  return {
    provider: 'smtp',
    messageId: result.messageId,
  }
}

const nodemailer = require('nodemailer')
const { SMTP_USER, SMTP_PASS } = require('../config/env')

const sendEmail = async ({ to, subject, html }) => {
  console.log('[sendEmail] Using SMTP_USER:', SMTP_USER || 'NOT SET')
  console.log('[sendEmail] SMTP_PASS:', SMTP_PASS ? 'SET' : 'NOT SET')

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP credentials not configured in env')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  const result = await transporter.sendMail({
    from: `"PhaStock" <${SMTP_USER}>`,
    to,
    subject,
    html,
  })

  console.log('[sendEmail] ✓ Mail sent, messageId:', result.messageId)
  return result
}

module.exports = sendEmail


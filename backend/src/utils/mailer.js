const nodemailer = require('nodemailer');
const { SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } = require('../config/env.js');
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth:
    SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS,
        }
      : undefined,
});
const sendVerificationEmail = async ({ to, code }) => {
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Verify your PhaStock account',
    text: `Your verification code is: ${code}\nThis code will expire in 15 minutes.`,
  });
};
const sendPasswordResetEmail = async ({ to, resetLink }) => {
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Reset your PhaStock password',
    text: `You requested a password reset.\n\nReset link: ${resetLink}\n\nThis link will expire in 1 hour.\nIf you did not request this, you can ignore this email.`,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };

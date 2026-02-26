import nodemailer from 'nodemailer';

import {
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from '../config/env.js';

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

export const sendVerificationEmail = async ({ to, code }) => {
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Verify your PhaStock account',
    text: `Your verification code is: ${code}\nThis code will expire in 15 minutes.`,
  });
};

import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

const initTransporter = async () => {
  if (transporter) return transporter;
  
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log('⚠️ No SMTP config found. Generating test Ethereal account for local dev...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return transporter;
};

/**
 * Standard Email Service for sending OTPs and Notifications via Nodemailer
 */
export const sendEmail = async (options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  otp?: string;
}) => {
  try {
    const t = await initTransporter();
    
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || '"AI DB Platform" <noreply@aidb.local>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('📧 Email sent successfully! Message ID:', info.messageId);
    
    if (!process.env.SMTP_HOST) {
      console.log('👀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👀 Email Preview URL: %s', nodemailer.getTestMessageUrl(info));
      console.log('👀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error);

    if (options.otp && env.NODE_ENV !== 'production') {
      console.warn(`
┌────────────────────────────────────────────────────────┐
│  ⚠️  DEVELOPER WARNING: EMAIL DELIVERY FAILED          │
│                                                        │
│  To: ${options.to.padEnd(46)} │
│  Subject: ${options.subject.padEnd(41)} │
│  OTP Code: ${options.otp.padEnd(44)} │
│                                                        │
│  Please use the OTP code above to proceed in dev mode. │
└────────────────────────────────────────────────────────┘
      `);
    }

    if (env.NODE_ENV === 'production') throw error;
  }
};

/**
 * Template: OTP Verification Email
 */
export const sendOTPEmail = async (email: string, otp: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0f172a; text-align: center;">Verify Your Account</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Welcome to AI DB Platform! Use the one-time password below to verify your email address. This code will expire in 5 minutes.
      </p>
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3b82f6;">${otp}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  const text = `Verify Your Account\n\nWelcome to AI DB Platform! Use the one-time password below to verify your email address. This code will expire in 5 minutes.\n\nOTP Code: ${otp}\n\nIf you didn't request this, you can safely ignore this email.`;

  await sendEmail({
    to: email,
    subject: `Your AI DB Platform Login Code: ${otp}`,
    html,
    text,
    otp,
  });
};

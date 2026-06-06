import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Standard Email Service for sending OTPs and Notifications via Resend
 */
export const sendEmail = async (options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  otp?: string;
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'AI DB Platform <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      ...(options.html ? { html: options.html } : { text: options.text || '' }),
    } as any);

    if (error) {
      throw new Error(error.message);
    }

    console.log('📧 Email sent successfully:', data?.id);
    return data;
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

    // Only throw in production so dev can continue without email
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

  await sendEmail({
    to: email,
    subject: `Verify Your Account — OTP: ${otp}`,
    html,
    otp,
  });
};

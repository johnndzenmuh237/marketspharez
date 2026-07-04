'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'Marketsphare'}" <${process.env.EMAIL_FROM || 'noreply@marketsphare.com'}>`,
    to,
    subject,
    html,
  });
};

const templates = {
  verifyEmail: (name, link) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:40px 24px;">
      <h2 style="color:#4f46e5;">Welcome to Marketsphare, ${name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0;">Verify Email</a>
      <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>`,

  resetPassword: (name, link) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:40px 24px;">
      <h2 style="color:#4f46e5;">Reset your password</h2>
      <p>Hi ${name}, we received a request to reset your Marketsphare password.</p>
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0;">Reset Password</a>
      <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, please ignore this email.</p>
    </div>`,

  applicationReceived: (workerName, jobTitle, company) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:40px 24px;">
      <h2 style="color:#4f46e5;">Application Received</h2>
      <p>Hi ${workerName}, your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been received.</p>
      <p>You'll hear back once the employer reviews your profile. Good luck!</p>
    </div>`,

  paymentReleased: (workerName, amount, jobTitle) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:40px 24px;">
      <h2 style="color:#10b981;">Payment Released 💰</h2>
      <p>Hi ${workerName}, <strong>$${amount}</strong> for <strong>${jobTitle}</strong> has been released to your account.</p>
      <p>Log in to withdraw your funds.</p>
    </div>`,
};

module.exports = { sendEmail, templates };

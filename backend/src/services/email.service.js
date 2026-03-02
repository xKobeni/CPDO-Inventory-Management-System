/**
 * Nodemailer transactional email service.
 * Uses SMTP for email delivery via Nodemailer: https://nodemailer.com
 *
 * Required env: 
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP port (587 for TLS, 465 for SSL, 25 for non-secure)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password or app password
 * - EMAIL_FROM_EMAIL: Sender email address
 *
 * Optional env:
 * - SMTP_SECURE: true for port 465, false for other ports (default: false)
 * - EMAIL_FROM_NAME: Sender display name (default: "CPDC Inventory")
 *
 * For Gmail: Use App Passwords (https://support.google.com/accounts/answer/185833)
 */

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.join(__dirname, "../templates");

let transporter = null;

function getTransporter() {
  if (!transporter && isConfigured()) {
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Connection and socket timeouts (in milliseconds)
      connectionTimeout: 10000, // 10 seconds to establish connection
      greetingTimeout: 5000,    // 5 seconds for SMTP greeting
      socketTimeout: 15000,     // 15 seconds for socket inactivity
      // Disable IPv6 to avoid connection issues
      family: 4, // Force IPv4
      // Connection pool settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    };

    transporter = nodemailer.createTransport(smtpConfig);
  }
  return transporter;
}

function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM_EMAIL
  );
}

function getSender() {
  const email = process.env.EMAIL_FROM_EMAIL || "noreply@example.com";
  const name = process.env.EMAIL_FROM_NAME || "CPDC Inventory";
  return `${name} <${email}>`;
}

/**
 * Load template file and replace variables with {{VARIABLE}} syntax
 */
function loadTemplate(templateName, variables = {}) {
  try {
    const templatePath = path.join(templateDir, templateName);
    
    // Check if template file exists
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template ${templateName} not found at ${templatePath}`);
      return null;
    }
    
    let content = fs.readFileSync(templatePath, "utf-8");

    // Replace {{VARIABLE}} with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      content = content.replace(regex, String(value));
    });

    // Remove any remaining {{VARIABLE}} tags
    content = content.replace(/{{[^}]+}}/g, "");

    return content;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error.message);
    return null;
  }
}

/**
 * Send a transactional email via Nodemailer (SMTP).
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.toName] - Recipient name (for display purposes)
 * @param {string} options.subject - Subject line
 * @param {string} [options.htmlContent] - HTML body
 * @param {string} [options.textContent] - Plain text body
 * @returns {Promise<{ messageId: string } | null>} messageId on success, null if email not configured
 */
export async function sendEmail({ to, toName, subject, htmlContent, textContent }) {
  if (!isConfigured()) {
    console.warn("Email not sent: SMTP configuration is incomplete.");
    console.warn("Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM_EMAIL");
    return null;
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("Nodemailer transporter not initialized");
    return null;
  }

  try {
    const mailOptions = {
      from: getSender(),
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully: ${info.messageId}`);
    return { messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email via Nodemailer: ${error.message}`);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.command) {
      console.error(`SMTP command: ${error.command}`);
    }
    // Reset transporter on connection errors to force reconnection
    if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT' || error.code === 'ENETUNREACH') {
      console.log('Resetting email transporter due to connection error');
      transporter = null;
    }
    throw error; // Throw error instead of returning null for better error handling
  }
}

/**
 * Send a notification when an admin resets a user's password.
 */
export async function sendPasswordResetNotification(to, userName) {
  const subject = "Your CPDC Inventory password was reset";
  const htmlContent = loadTemplate("admin-password-reset-notification.html", {
    NAME: userName || "User",
  });

  if (!htmlContent) {
    console.error("Failed to load admin password reset template");
    return null;
  }

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
  });
}

/**
 * Send a welcome email when a new user is created (e.g. by admin).
 */
export async function sendWelcomeEmail(to, userName, tempPassword = null) {
  const subject = "Welcome to CPDC Inventory System";
  const htmlContent = loadTemplate("welcome-email.html", {
    NAME: userName || "User",
    TEMP_PASSWORD: tempPassword != null && tempPassword !== "" ? tempPassword : "",
  });

  if (!htmlContent) {
    console.error("Failed to load welcome email template");
    return null;
  }

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
  });
}

/** OTP validity in minutes for verification vs reset */
const VERIFICATION_OTP_MINUTES = 24 * 60;
const RESET_OTP_MINUTES = 15;
const VERIFICATION_EXPIRY_HOURS = VERIFICATION_OTP_MINUTES / 60;

/**
 * Send email verification link (admin-created account must verify before login).
 */
export async function sendVerificationEmail(to, userName, token) {
  const verificationUrl = `${process.env.CLIENT_ORIGIN}/verify-email?token=${token}`;
  const subject = "Verify your CPDC Inventory account";
  const htmlContent = loadTemplate("verification-email.html", {
    NAME: userName || "User",
    VERIFICATION_URL: verificationUrl,
  });

  if (!htmlContent) {
    console.error("Failed to load verification email template");
    return null;
  }

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
  });
}

/**
 * Send password reset OTP (forgot password flow).
 */
export async function sendPasswordResetOtpEmail(to, userName, otp) {
  const subject = "Reset your CPDC Inventory password";
  const htmlContent = loadTemplate("password-reset-otp-email.html", {
    NAME: userName || "User",
    OTP: otp,
    EXPIRY_MINUTES: String(RESET_OTP_MINUTES),
  });

  if (!htmlContent) {
    console.error("Failed to load password reset OTP email template");
    return null;
  }

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
  });
}

export { isConfigured as isEmailConfigured };

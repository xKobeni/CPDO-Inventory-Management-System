/**
 * Resend transactional email service.
 * Uses Resend API: https://resend.com
 *
 * Required env: RESEND_API_KEY
 * Optional env: EMAIL_FROM_EMAIL, EMAIL_FROM_NAME (sender shown in emails)
 *
 * Free tier: 100 emails/day
 * Sign up at: https://resend.com
 */

import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.join(__dirname, "../templates");

let resendClient = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function getSender() {
  const email = process.env.EMAIL_FROM_EMAIL || "noreply@cpdc-inventory.resend.dev";
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
 * Send a transactional email via Resend.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.toName] - Recipient name (for reference only)
 * @param {string} options.subject - Subject line
 * @param {string} [options.htmlContent] - HTML body
 * @param {string} [options.textContent] - Plain text body
 * @returns {Promise<{ messageId: string } | null>} messageId on success, null if email not configured
 */
export async function sendEmail({ to, toName, subject, htmlContent, textContent }) {
  if (!isConfigured()) {
    console.warn("Email not sent: RESEND_API_KEY is not set.");
    return null;
  }

  const client = getResendClient();
  if (!client) {
    console.error("Resend client not initialized");
    return null;
  }

  try {
    const result = await client.emails.send({
      from: getSender(),
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (result.error) {
      console.error(`Resend error: ${result.error.message}`);
      return null;
    }

    return { messageId: result.data.id };
  } catch (error) {
    console.error(`Failed to send email via Resend: ${error.message}`);
    return null;
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
 * Send email verification OTP (admin-created account must verify before login).
 */
export async function sendVerificationOtpEmail(to, userName, otp) {
  const subject = "Verify your CPDC Inventory account";
  const htmlContent = loadTemplate("verification-otp-email.html", {
    NAME: userName || "User",
    OTP: otp,
    EXPIRY_HOURS: String(VERIFICATION_EXPIRY_HOURS),
  });

  if (!htmlContent) {
    console.error("Failed to load verification OTP email template");
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

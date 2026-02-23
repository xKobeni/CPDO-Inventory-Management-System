/**
 * Brevo (formerly Sendinblue) transactional email service.
 * Uses Brevo SMTP API: https://api.brevo.com/v3/smtp/email
 *
 * Required env: BREVO_API_KEY
 * Optional env: EMAIL_FROM_EMAIL, EMAIL_FROM_NAME (sender shown in emails)
 *
 * Optional Brevo template IDs (use your templates from Brevo dashboard):
 *   BREVO_TEMPLATE_WELCOME        - Welcome / account created (params: NAME, TEMP_PASSWORD)
 *   BREVO_TEMPLATE_VERIFICATION  - Email verification OTP (params: NAME, OTP, EXPIRY_HOURS)
 *   BREVO_TEMPLATE_PASSWORD_RESET - Forgot-password OTP (params: NAME, OTP, EXPIRY_MINUTES)
 *   BREVO_TEMPLATE_ADMIN_PASSWORD_RESET - Admin reset notification (params: NAME)
 * If set, these override the built-in HTML emails. Subject can be set in the template.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function isConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

function getSender() {
  return {
    name: process.env.EMAIL_FROM_NAME || "CPDC Inventory",
    email: process.env.EMAIL_FROM_EMAIL || "cpdc.systems@gmail.com",
  };
}

/** Parse optional template ID from env (Brevo template IDs are numbers). */
function getTemplateId(envKey) {
  const v = process.env[envKey];
  if (v == null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Send a transactional email via Brevo.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.toName] - Recipient name
 * @param {string} options.subject - Subject line
 * @param {string} [options.htmlContent] - HTML body (use one of htmlContent or textContent)
 * @param {string} [options.textContent] - Plain text body
 * @param {Object} [options.params] - Dynamic variables for template (e.g. {{ params.name }})
 * @param {number} [options.templateId] - Brevo template ID (use instead of htmlContent/textContent)
 * @returns {Promise<{ messageId: string } | null>} messageId on success, null if email not configured
 */
export async function sendEmail({ to, toName, subject, htmlContent, textContent, params, templateId }) {
  if (!isConfigured()) {
    console.warn("Email not sent: BREVO_API_KEY is not set.");
    return null;
  }

  const body = {
    sender: getSender(),
    to: [{ email: to, name: toName || undefined }].filter((r) => r.email),
    subject,
  };

  if (templateId) {
    body.templateId = templateId;
    if (params) body.params = params;
  } else if (htmlContent) {
    body.htmlContent = htmlContent;
    if (params) body.params = params;
  } else if (textContent) {
    body.textContent = textContent;
    if (params) body.params = params;
  } else {
    throw new Error("Provide htmlContent, textContent, or templateId");
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return { messageId: data.messageId };
}

/**
 * Send a notification when an admin resets a user's password.
 */
export async function sendPasswordResetNotification(to, userName) {
  const templateId = getTemplateId("BREVO_TEMPLATE_ADMIN_PASSWORD_RESET");
  if (templateId) {
    return sendEmail({
      to,
      toName: userName,
      subject: "Your CPDC Inventory password was reset",
      templateId,
      params: { NAME: userName || "User" },
    });
  }
  const subject = "Your CPDC Inventory password was reset";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>Hello${userName ? ` ${userName}` : ""},</p>
  <p>Your password for the CPDC Inventory System was reset by an administrator.</p>
  <p>If you did not request this change, please contact your administrator.</p>
  <p>— CPDC Inventory System</p>
</body>
</html>`;
  const textContent = `Hello${userName ? ` ${userName}` : ""},\n\nYour password for the CPDC Inventory System was reset by an administrator.\n\nIf you did not request this change, please contact your administrator.\n\n— CPDC Inventory System`;

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Send a welcome email when a new user is created (e.g. by admin).
 * Brevo template params (if using BREVO_TEMPLATE_WELCOME): NAME, TEMP_PASSWORD (empty if not set)
 */
export async function sendWelcomeEmail(to, userName, tempPassword = null) {
  const templateId = getTemplateId("BREVO_TEMPLATE_WELCOME");
  if (templateId) {
    return sendEmail({
      to,
      toName: userName,
      subject: "Welcome to CPDC Inventory System",
      templateId,
      params: {
        NAME: userName || "User",
        TEMP_PASSWORD: tempPassword != null && tempPassword !== "" ? tempPassword : "",
      },
    });
  }
  const subject = "Welcome to CPDC Inventory System";
  const showTemp = tempPassword != null && tempPassword !== "";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>Hello${userName ? ` ${userName}` : ""},</p>
  <p>Your account for the CPDC Inventory System has been created.</p>
  ${showTemp ? `<p>Your temporary password is: <strong>${escapeHtml(tempPassword)}</strong></p><p>Please change it after your first login.</p>` : ""}
  <p>— CPDC Inventory System</p>
</body>
</html>`;
  let textContent = `Hello${userName ? ` ${userName}` : ""},\n\nYour account for the CPDC Inventory System has been created.\n`;
  if (showTemp) textContent += `\nYour temporary password is: ${tempPassword}\nPlease change it after your first login.\n`;
  textContent += "\n— CPDC Inventory System";

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
    textContent,
  });
}

/** OTP validity in minutes for verification vs reset */
const VERIFICATION_OTP_MINUTES = 24 * 60;
const RESET_OTP_MINUTES = 15;
const VERIFICATION_EXPIRY_HOURS = VERIFICATION_OTP_MINUTES / 60;

/**
 * Send email verification OTP (admin-created account must verify before login).
 * Brevo template params (if using BREVO_TEMPLATE_VERIFICATION): NAME, OTP, EXPIRY_HOURS
 */
export async function sendVerificationOtpEmail(to, userName, otp) {
  const templateId = getTemplateId("BREVO_TEMPLATE_VERIFICATION");
  if (templateId) {
    return sendEmail({
      to,
      toName: userName,
      subject: "Verify your CPDC Inventory account",
      templateId,
      params: {
        NAME: userName || "User",
        OTP: otp,
        EXPIRY_HOURS: String(VERIFICATION_EXPIRY_HOURS),
      },
    });
  }
  const subject = "Verify your CPDC Inventory account";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>Hello${userName ? ` ${userName}` : ""},</p>
  <p>Your CPDC Inventory account has been created. Verify your email using this one-time code:</p>
  <p style="font-size: 1.25rem; font-weight: bold; letter-spacing: 0.25em;">${escapeHtml(otp)}</p>
  <p>This code expires in ${VERIFICATION_EXPIRY_HOURS} hours. If you did not request this, you can ignore this email.</p>
  <p>— CPDC Inventory System</p>
</body>
</html>`;
  const textContent = `Hello${userName ? ` ${userName}` : ""},\n\nYour CPDC Inventory account has been created. Verify your email using this one-time code:\n\n${otp}\n\nThis code expires in ${VERIFICATION_EXPIRY_HOURS} hours. If you did not request this, you can ignore this email.\n\n— CPDC Inventory System`;

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Send password reset OTP (forgot password flow).
 * Brevo template params (if using BREVO_TEMPLATE_PASSWORD_RESET): NAME, OTP, EXPIRY_MINUTES
 */
export async function sendPasswordResetOtpEmail(to, userName, otp) {
  const templateId = getTemplateId("BREVO_TEMPLATE_PASSWORD_RESET");
  if (templateId) {
    return sendEmail({
      to,
      toName: userName,
      subject: "Reset your CPDC Inventory password",
      templateId,
      params: {
        NAME: userName || "User",
        OTP: otp,
        EXPIRY_MINUTES: String(RESET_OTP_MINUTES),
      },
    });
  }
  const subject = "Reset your CPDC Inventory password";
  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5;">
  <p>Hello${userName ? ` ${userName}` : ""},</p>
  <p>Use this one-time code to reset your password:</p>
  <p style="font-size: 1.25rem; font-weight: bold; letter-spacing: 0.25em;">${escapeHtml(otp)}</p>
  <p>This code expires in ${RESET_OTP_MINUTES} minutes. If you did not request a password reset, ignore this email.</p>
  <p>— CPDC Inventory System</p>
</body>
</html>`;
  const textContent = `Hello${userName ? ` ${userName}` : ""},\n\nUse this one-time code to reset your password:\n\n${otp}\n\nThis code expires in ${RESET_OTP_MINUTES} minutes. If you did not request a password reset, ignore this email.\n\n— CPDC Inventory System`;

  return sendEmail({
    to,
    toName: userName,
    subject,
    htmlContent,
    textContent,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { isConfigured as isEmailConfigured };

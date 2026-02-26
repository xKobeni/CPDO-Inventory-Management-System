#!/usr/bin/env node
/**
 * Email Template Testing Script
 * Usage: node scripts/testEmailTemplates.js
 */

import dotenv from "dotenv";
import {
  sendWelcomeEmail,
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetNotification,
  isEmailConfigured,
} from "../src/services/email.service.js";

dotenv.config();

const TEST_EMAIL = process.env.TEST_EMAIL || "admin@cpdo.gov.ph";

async function runTests() {
  console.log("📧 Email Template Testing\n");
  console.log("=".repeat(50));

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.error("❌ Email not configured!");
    console.error("   Please set RESEND_API_KEY in .env");
    process.exit(1);
  }

  console.log("✅ Email service configured\n");
  console.log(`Test email will be sent to: ${TEST_EMAIL}\n`);

  const tests = [
    {
      name: "Welcome Email",
      fn: () =>
        sendWelcomeEmail(TEST_EMAIL, "John Doe", "TempPass123!"),
      desc: "New user account created with temporary password",
    },
    {
      name: "Verification OTP Email",
      fn: () => sendVerificationOtpEmail(TEST_EMAIL, "Jane Smith", "123456"),
      desc: "Email verification code",
    },
    {
      name: "Password Reset OTP Email",
      fn: () =>
        sendPasswordResetOtpEmail(TEST_EMAIL, "John Doe", "654321"),
      desc: "Forgot password reset code",
    },
    {
      name: "Admin Password Reset Notification",
      fn: () => sendPasswordResetNotification(TEST_EMAIL, "Jane Smith"),
      desc: "Admin manually reset password",
    },
  ];

  for (const test of tests) {
    console.log(`\n📨 Testing: ${test.name}`);
    console.log(`   ${test.desc}`);
    console.log("   Sending...");

    try {
      const result = await test.fn();
      if (result?.messageId) {
        console.log(`   ✅ Success!`);
        console.log(`   Message ID: ${result.messageId}`);
      } else {
        console.log(`   ⚠️  Email not configured (no API key)`);
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Test Complete!\n");
  console.log("📧 Check your inbox at:", TEST_EMAIL);
  console.log("\nDebug Tips:");
  console.log("  • Check spam/junk folder");
  console.log("  • Verify Resend API key is correct");
  console.log("  • Check Resend dashboard for logs");
  console.log("  • Enable verbose logging if needed");
}

runTests().catch(console.error);

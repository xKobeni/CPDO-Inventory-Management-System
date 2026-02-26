import dotenv from "dotenv";
import { 
  sendWelcomeEmail, 
  sendVerificationOtpEmail, 
  sendPasswordResetOtpEmail,
  sendPasswordResetNotification,
  isEmailConfigured
} from "../src/services/email.service.js";

dotenv.config();

// Change this to your email address for testing
const TEST_EMAIL = "admin@cpdo.gov.ph"; 

console.log("🧪 Email Service Test\n");
console.log("=".repeat(50));

// Check if email is configured
if (!isEmailConfigured()) {
  console.log("\n❌ Email service not configured!");
  console.log("   Please add RESEND_API_KEY to your .env file");
  console.log("   Get your API key from: https://resend.com/api-keys");
  process.exit(1);
}

console.log("\n✅ Email service is configured");
console.log(`📧 Sending test emails to: ${TEST_EMAIL}\n`);

// Test all email types
async function runTests() {
  try {
    console.log("1️⃣  Testing Welcome Email...");
    const result1 = await sendWelcomeEmail(
      TEST_EMAIL,
      "John Doe",
      "TempPassword123!"
    );
    if (result1) {
      console.log(`   ✅ Welcome email sent! (ID: ${result1.messageId})`);
    }

    console.log("\n2️⃣  Testing Verification OTP Email...");
    const result2 = await sendVerificationOtpEmail(
      TEST_EMAIL,
      "John Doe",
      "123456"
    );
    if (result2) {
      console.log(`   ✅ Verification email sent! (ID: ${result2.messageId})`);
    }

    console.log("\n3️⃣  Testing Password Reset OTP Email...");
    const result3 = await sendPasswordResetOtpEmail(
      TEST_EMAIL,
      "John Doe",
      "987654"
    );
    if (result3) {
      console.log(`   ✅ Password reset email sent! (ID: ${result3.messageId})`);
    }

    console.log("\n4️⃣  Testing Admin Password Reset Notification...");
    const result4 = await sendPasswordResetNotification(
      TEST_EMAIL,
      "John Doe"
    );
    if (result4) {
      console.log(`   ✅ Admin notification sent! (ID: ${result4.messageId})`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("\n✅ All test emails sent successfully!");
    console.log(`📬 Check your inbox at: ${TEST_EMAIL}`);
    console.log("   (Don't forget to check spam/junk folder)");

  } catch (error) {
    console.error("\n❌ Error sending emails:");
    console.error(`   ${error.message}`);
    
    if (error.message.includes("RESEND_API_KEY")) {
      console.log("\n💡 Tip: Make sure you have a valid Resend API key");
    }
    
    if (error.message.includes("401")) {
      console.log("\n💡 Tip: Your API key might be invalid");
      console.log("   Get a new one from: https://resend.com/api-keys");
    }
    
    if (error.message.includes("sender")) {
      console.log("\n💡 Tip: Verify your sender email in Resend dashboard");
      console.log("   Or use the default: noreply@cpdc-inventory.resend.dev");
    }
    
    process.exit(1);
  }
}

runTests();

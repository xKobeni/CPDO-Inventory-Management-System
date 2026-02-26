import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function runDiagnostics() {
  console.log("🔍 Email Service Diagnostics\n");
  console.log("=" .repeat(50));

  // 1. Check if API key exists
  console.log("\n1️⃣  API Key Check:");
  if (!process.env.BREVO_API_KEY) {
    console.log("❌ BREVO_API_KEY is not set in .env");
    return;
  }
  console.log("✅ BREVO_API_KEY is set");
  console.log(`   Key preview: ${process.env.BREVO_API_KEY.substring(0, 20)}...`);

  // 2. Validate API key with Brevo
  console.log("\n2️⃣  Validating API Key with Brevo:");
  try {
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ API Key validation failed (${response.status})`);
      console.log(`   Error: ${errorData.message || JSON.stringify(errorData)}`);
      return;
    }

    const accountData = await response.json();
    console.log("✅ API Key is valid!");
    console.log(`   Account: ${accountData.email}`);
    console.log(`   First Name: ${accountData.firstName}`);
    console.log(`   Company: ${accountData.company}`);
  } catch (err) {
    console.log("❌ Network error checking API key:");
    console.log(`   ${err.message}`);
    return;
  }

  // 3. Check sender email
  console.log("\n3️⃣  Sender Email Configuration:");
  const senderEmail = process.env.EMAIL_FROM_EMAIL || "cpdc.systems@gmail.com";
  const senderName = process.env.EMAIL_FROM_NAME || "CPDC Inventory";
  console.log(`   Email: ${senderEmail}`);
  console.log(`   Name: ${senderName}`);
  console.log("   ⚠️  Make sure this sender email is verified in Brevo dashboard");

  // 4. Check sender verification status
  console.log("\n4️⃣  Checking Sender Verification Status:");
  try {
    const response = await fetch("https://api.brevo.com/v3/senders", {
      method: "GET",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
      },
    });

    if (!response.ok) {
      console.log("⚠️  Could not fetch sender list");
      return;
    }

    const sendersData = await response.json();
    const verifiedSenders = sendersData.senders.filter(s => s.active);
    
    if (verifiedSenders.length === 0) {
      console.log("❌ No verified senders found!");
      console.log("   Go to Brevo dashboard (Senders) and verify an email address");
      return;
    }

    const senderFound = verifiedSenders.find(s => s.email === senderEmail);
    if (senderFound) {
      console.log(`✅ Sender "${senderEmail}" is verified`);
    } else {
      console.log(`⚠️  Sender "${senderEmail}" is not verified`);
      console.log("   Verified senders:");
      verifiedSenders.forEach(s => console.log(`      • ${s.email} (${s.name})`));
    }
  } catch (err) {
    console.log("⚠️  Error checking senders:");
    console.log(`   ${err.message}`);
  }

  // 5. Check email templates
  console.log("\n5️⃣  Email Templates Configuration:");
  const templates = [
    { env: "BREVO_TEMPLATE_VERIFICATION", purpose: "Email verification OTP" },
    { env: "BREVO_TEMPLATE_PASSWORD_RESET", purpose: "Password reset OTP" },
    { env: "BREVO_TEMPLATE_ADMIN_PASSWORD_RESET", purpose: "Admin password reset" },
  ];

  templates.forEach(({ env, purpose }) => {
    const id = process.env[env];
    if (id) {
      console.log(`✅ ${env}: ${id} (${purpose})`);
    } else {
      console.log(`⚠️  ${env}: Not set (will use built-in HTML)`);
    }
  });

  // 6. Test sending a real email
  console.log("\n6️⃣  Test Email Send:");
  const testEmail = process.env.TEST_EMAIL || "admin@cpdo.gov.ph";
  console.log(`   Sending test email to: ${testEmail}`);
  
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: testEmail }],
        subject: "Test Email from CPDC Inventory System",
        htmlContent: `
          <h1>Test Email</h1>
          <p>If you received this email, the email service is working correctly!</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log(`❌ Email send failed (${response.status})`);
      console.log(`   Error: ${result.message || JSON.stringify(result)}`);
    } else {
      console.log("✅ Test email sent successfully!");
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Check your inbox (${testEmail}) for the test email`);
    }
  } catch (err) {
    console.log("❌ Error sending test email:");
    console.log(`   ${err.message}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📝 Troubleshooting checklist:");
  console.log("  □ API key is valid and active");
  console.log("  □ Sender email is verified in Brevo");
  console.log("  □ Recipient email address is valid");
  console.log("  □ Templates exist in Brevo (if using custom templates)");
  console.log("  □ Check spam/junk folder for emails");
  console.log("  □ Check Brevo dashboard > Reports > Transactional");
}

runDiagnostics().catch(console.error);

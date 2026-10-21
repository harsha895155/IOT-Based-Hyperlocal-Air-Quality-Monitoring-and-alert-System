const nodemailer = require('nodemailer');

/**
 * Creates and returns the Nodemailer transporter based on environment variables.
 * Supports Gmail (airguard396@gmail.com) via Google App Passwords, or any standard SMTP service.
 */
function getTransporter() {
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || 'airguard396@gmail.com';
  const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  // Custom SMTP configuration
  if (process.env.SMTP_HOST && emailUser && emailPass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  // Gmail configuration for airguard396@gmail.com
  if (emailPass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  return null;
}

/**
 * Sends a branded password reset email to the user.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User's name or username
 * @param {string} options.resetToken - The cryptographically secure reset token
 * @param {string} options.resetUrl - The direct 1-click password reset link
 */
async function sendPasswordResetEmail({ to, name, resetToken, resetUrl }) {
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'airguard396@gmail.com';
  const from = `"AirGuard Support" <${senderEmail}>`;
  const subject = '🔐 Reset Your AirGuard Password';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your AirGuard Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b1120;
          color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #0f172a;
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }
        .header {
          background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 24px;
          margin: 0 0 6px 0;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .header p {
          color: #bae6fd;
          font-size: 13px;
          margin: 0;
          font-weight: 500;
        }
        .content {
          padding: 36px 32px;
          color: #e2e8f0;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 14px;
        }
        .desc {
          font-size: 14.5px;
          color: #94a3b8;
          margin-bottom: 28px;
        }
        .btn-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 700;
          font-size: 15px;
          padding: 14px 32px;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);
        }
        .token-box {
          background: rgba(15, 23, 42, 0.8);
          border: 1px dashed rgba(56, 189, 248, 0.4);
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
          text-align: center;
        }
        .token-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #38bdf8;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .token-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          color: #f1f5f9;
          word-break: break-all;
          background: rgba(0, 0, 0, 0.4);
          padding: 8px 12px;
          border-radius: 6px;
          display: inline-block;
        }
        .security-notice {
          font-size: 12.5px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 20px;
          margin-top: 28px;
        }
        .footer {
          background: #090d16;
          padding: 20px 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer a {
          color: #38bdf8;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌍 AirGuard</h1>
          <p>Hyperlocal Air Quality & Environmental Telemetry Platform</p>
        </div>

        <div class="content">
          <div class="greeting">Hello, ${name || 'AirGuard User'} 👋</div>
          <div class="desc">
            We received a request to reset the password for your AirGuard account associated with <strong>${to}</strong>.
            Click the secure button below to set a new password:
          </div>

          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">
              Reset Your Password ➔
            </a>
          </div>

          <div class="token-box">
            <div class="token-label">Alternative: Manual Reset Token</div>
            <div class="token-code">${resetToken}</div>
            <div style="font-size: 11.5px; color: #94a3b8; margin-top: 6px;">
              You can also copy and paste this token into the AirGuard password reset form.
            </div>
          </div>

          <div class="security-notice">
            ⏰ <strong>Expiry Notice:</strong> This password reset link and token will expire in <strong>60 minutes</strong>.<br>
            🛡️ <strong>Security Notice:</strong> If you did not request this password reset, you can safely ignore this email. Your current password remains secure.
          </div>
        </div>

        <div class="footer">
          AirGuard Environmental Intelligence System • Official Support: <a href="mailto:${senderEmail}">${senderEmail}</a><br>
          Live Web App: <a href="https://airguard-hyperlocal.vercel.app">airguard-hyperlocal.vercel.app</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
AirGuard Password Reset

Hello ${name || 'AirGuard User'},

We received a request to reset the password for your AirGuard account (${to}).

To choose a new password, open this link in your browser:
${resetUrl}

Or copy and paste this Reset Token manually into the password reset form:
${resetToken}

This link and token will expire in 60 minutes.
If you did not request this reset, please ignore this email.

— The AirGuard Team
Official Mailbox: ${senderEmail}
  `.trim();

  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`[EmailService] ⚠️ SMTP/Gmail credentials not configured in environment (.env).`);
    console.warn(`[EmailService] Reset link generated for ${to}: ${resetUrl}`);
    console.warn(`[EmailService] To enable live email dispatch from ${senderEmail}, set EMAIL_PASS or GMAIL_APP_PASSWORD in Backend/.env.`);
    
    // Return simulated success with debug notice in dev mode so password reset flow works seamlessly
    return {
      success: true,
      delivered: false,
      notice: 'Email transport credentials not yet configured in Backend/.env (EMAIL_PASS).',
      resetUrl,
    };
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  });

  console.log(`[EmailService] ✅ Password reset email successfully dispatched to ${to} (Message ID: ${info.messageId})`);
  return {
    success: true,
    delivered: true,
    messageId: info.messageId,
  };
}

module.exports = {
  sendPasswordResetEmail,
};

const nodemailer = require('nodemailer');

/**
 * Creates and returns the Nodemailer transporter based on environment variables.
 * Supports Gmail (airguard396@gmail.com) via Google App Passwords, or any standard SMTP service.
 */
function getTransporter() {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'airguard396@gmail.com').trim();
  const rawPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
  const emailPass = rawPass.replace(/\s+/g, '').trim();

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
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4, // Enforce IPv4 on cloud hosts (avoids IPv6 connection hang on Render/Docker)
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  return null;
}

/**
 * Dispatches email via Vercel Serverless Function over HTTPS (port 443).
 * This completely bypasses Render Free Tier's outbound SMTP port blocking (ports 25, 465, 587).
 */
async function trySendViaVercelRelay({ to, subject, html, text }) {
  const vercelAppUrl = process.env.APP_URL || 'https://airguard-hyperlocal.vercel.app';
  const relayEndpoint = `${vercelAppUrl.replace(/\/$/, '')}/api/send-reset-email`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(relayEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: 'AirGuardRelaySecret2026',
        to,
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      console.log(`[EmailService] ✅ Email dispatched via Vercel Relay over HTTPS to ${to} (MessageId: ${data.messageId})`);
      return { success: true, delivered: true, messageId: data.messageId, via: 'vercel-relay' };
    } else {
      const errText = await res.text();
      console.warn(`[EmailService] ⚠️ Vercel Relay responded with HTTP ${res.status}: ${errText}. Falling back to direct SMTP...`);
    }
  } catch (relayErr) {
    console.warn(`[EmailService] ⚠️ Vercel Relay unreachable (${relayErr.message}). Falling back to direct SMTP...`);
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

  // 1. Primary Attempt: Relay via Vercel Serverless Function over HTTPS (port 443)
  // This bypasses cloud provider SMTP port blocks (such as Render free tier)
  const relayResult = await trySendViaVercelRelay({
    to,
    subject,
    html: htmlContent,
    text: textContent,
  });

  if (relayResult && relayResult.success) {
    return relayResult;
  }

  // 2. Secondary Attempt: Direct Nodemailer SMTP
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

  const mailPayload = {
    from,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailPayload);
    console.log(`[EmailService] ✅ Password reset email successfully dispatched to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      delivered: true,
      messageId: info.messageId,
    };
  } catch (primaryErr) {
    console.warn(`[EmailService] ⚠️ Primary SMTP delivery failed (${primaryErr.message}). Attempting port 587 fallback...`);
    try {
      const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || 'airguard396@gmail.com').trim();
      const rawPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
      const emailPass = rawPass.replace(/\s+/g, '').trim();

      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const fallbackInfo = await fallbackTransporter.sendMail(mailPayload);
      console.log(`[EmailService] ✅ Password reset email dispatched via port 587 to ${to} (Message ID: ${fallbackInfo.messageId})`);
      return {
        success: true,
        delivered: true,
        messageId: fallbackInfo.messageId,
      };
    } catch (fallbackErr) {
      console.error(`[EmailService] ❌ Both SMTP ports failed to send to ${to}:`, fallbackErr.message);
      return {
        success: false,
        delivered: false,
        error: fallbackErr.message,
      };
    }
  }
}

/**
 * Dispatches a high-priority environmental exceedance email alert to a device owner.
 * Follows industry emergency alerting formatting (color-coded, actionable recommendations).
 */
async function sendAirQualityAlertEmail({ to, name, deviceName, location, aqi, category, gasPPM, temperature, humidity, message, severity }) {
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'airguard396@gmail.com';
  const from = `"AirGuard Alert System" <${senderEmail}>`;

  const isExtreme = aqi > 300 || severity === 'Extreme';
  const isSevere = aqi > 200 || severity === 'Severe';
  const badgeColor = isExtreme ? '#b91c1c' : isSevere ? '#c2410c' : '#d97706';
  const badgeText = isExtreme ? 'HAZARDOUS AIR QUALITY' : isSevere ? 'VERY UNHEALTHY' : 'UNHEALTHY AIR';

  const subject = `🚨 [${badgeText}] AQI ${aqi} Alert at ${deviceName || location}`;
  const appUrl = (process.env.APP_URL || 'https://airguard-hyperlocal.vercel.app').replace(/\/$/, '');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AirGuard Environmental Alert</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 24px auto; background: #0f172a; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); }
        .banner { background: ${badgeColor}; padding: 24px; text-align: center; }
        .banner h1 { color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 800; letter-spacing: 0.04em; }
        .banner p { color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; }
        .content { padding: 28px 24px; }
        .metric-card { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px; margin: 18px 0; text-align: center; }
        .metric-val { font-size: 48px; font-weight: 800; color: ${badgeColor}; line-height: 1; margin-bottom: 6px; }
        .metric-lbl { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
        .grid { display: table; width: 100%; margin: 16px 0; }
        .grid-col { display: table-cell; width: 33.3%; text-align: center; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
        .advisory { background: rgba(239, 68, 68, 0.08); border-left: 4px solid ${badgeColor}; padding: 14px 16px; border-radius: 0 10px 10px 0; margin: 20px 0; font-size: 14px; line-height: 1.5; color: #fecaca; }
        .btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #00d2b4 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 14px; }
        .footer { padding: 18px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.06); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="banner">
          <h1>🚨 ${badgeText}</h1>
          <p>Station: ${deviceName || 'AirGuard Sensing Node'} &bull; ${location || 'Monitored Facility'}</p>
        </div>
        <div class="content">
          <p style="font-size: 15px; color: #e2e8f0; margin-top: 0;">
            Hello <strong>${name || 'Resident'}</strong>, an air quality threshold exceedance was recorded by your physical AirGuard monitoring station.
          </p>
          <div class="metric-card">
            <div class="metric-val">${aqi}</div>
            <div class="metric-lbl">Air Quality Index (${category})</div>
          </div>
          <div class="grid">
            <div class="grid-col">
              <strong style="color:#f8fafc; font-size: 16px;">${gasPPM != null ? gasPPM + ' ppm' : 'N/A'}</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">GAS POLLUTION</span>
            </div>
            <div class="grid-col" style="border-left: 4px solid #0f172a; border-right: 4px solid #0f172a;">
              <strong style="color:#f8fafc; font-size: 16px;">${temperature != null ? temperature + '°C' : 'N/A'}</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">TEMPERATURE</span>
            </div>
            <div class="grid-col">
              <strong style="color:#f8fafc; font-size: 16px;">${humidity != null ? humidity + '%' : 'N/A'}</strong><br>
              <span style="font-size: 11px; color: #94a3b8;">HUMIDITY</span>
            </div>
          </div>
          <div class="advisory">
            <strong>⚠️ Health Advisory:</strong><br>
            ${message || 'Elevated pollutant concentrations detected. Sensitive individuals and children should stay indoors with windows closed.'}
          </div>
          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${appUrl}/dashboard" class="btn">View Live Telemetry Dashboard →</a>
          </div>
        </div>
        <div class="footer">
          AirGuard Hyperlocal Air Quality Intelligence &bull; Standardized CAP v1.2 Telemetry
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `🚨 [${badgeText}] AirGuard Alert: AQI ${aqi} (${category}) detected at ${deviceName || location}. Advisory: ${message}. View dashboard: ${appUrl}/dashboard`;

  const mailPayload = {
    from,
    to,
    subject,
    text: textContent,
    html: htmlContent,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
    },
  };

  // Try direct SMTP first
  const transporter = getTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail(mailPayload);
      console.log(`[AlertService] ✅ Alert email dispatched to ${to} (Message ID: ${info.messageId})`);
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.warn(`[AlertService] Direct SMTP failed (${smtpErr.message}). Trying HTTPS relay...`);
    }
  }

  // Fallback over Vercel HTTPS relay
  return await trySendViaVercelRelay(mailPayload);
}

module.exports = {
  sendPasswordResetEmail,
  sendAirQualityAlertEmail,
};


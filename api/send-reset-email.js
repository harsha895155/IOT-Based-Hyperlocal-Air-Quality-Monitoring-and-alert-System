const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, to, subject, html, text } = req.body || {};

  // Verify internal shared secret
  if (secret !== 'AirGuardRelaySecret2026') {
    return res.status(401).json({ error: 'Unauthorized relay request' });
  }

  if (!to || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required email fields (to, html/text)' });
  }

  const emailUser = (process.env.EMAIL_USER || 'airguard396@gmail.com').trim();
  const rawPass = process.env.EMAIL_PASS || 'sftciqfjzucvblen';
  const emailPass = rawPass.replace(/\s+/g, '').trim();

  const mailOptions = {
    from: `"AirGuard Support" <${emailUser}>`,
    to,
    subject: subject || '🔐 Reset Your AirGuard Password',
    text: text || '',
    html: html || '',
  };

  // Primary: port 465 (SMTPS)
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`[VercelRelay] Successfully sent email to ${to} (MessageId: ${info.messageId})`);
    return res.status(200).json({ success: true, delivered: true, messageId: info.messageId });
  } catch (err) {
    console.warn(`[VercelRelay] Port 465 delivery attempt failed (${err.message}). Trying fallback port 587...`);
    // Fallback: port 587 (STARTTLS)
    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
      console.log(`[VercelRelay] Successfully sent email to ${to} via port 587 (MessageId: ${fallbackInfo.messageId})`);
      return res.status(200).json({ success: true, delivered: true, messageId: fallbackInfo.messageId });
    } catch (fallbackErr) {
      console.error(`[VercelRelay] Both SMTP ports failed to send to ${to}:`, fallbackErr.message);
      return res.status(500).json({ error: fallbackErr.message });
    }
  }
};

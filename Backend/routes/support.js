const express = require('express');
const router = express.Router();
const { sendSupportInquiryEmail, sendSupportAutoReplyEmail } = require('../services/emailService');

/**
 * POST /api/support/inquiry
 * Submits a technical inquiry, dispatches notification to website support mail (airguard396@gmail.com),
 * and dispatches an automated diagnostic answer to the user's email.
 */
router.post('/inquiry', async (req, res, next) => {
  try {
    const { name, email, category, nodeId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Inquiry message cannot be empty.' });
    }

    const recipientEmail = (email || '').trim();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required so we can deliver your answer.' });
    }

    const inquiryId = Date.now().toString().slice(-6);
    const senderName = (name || '').trim() || recipientEmail.split('@')[0];
    const cat = (category || 'hardware').trim();
    const node = (nodeId || 'All Stations').trim();
    const cleanMsg = message.trim();

    // 1. Dispatch inquiry to website admin email (airguard396@gmail.com)
    sendSupportInquiryEmail({
      inquiryId,
      name: senderName,
      email: recipientEmail,
      category: cat,
      nodeId: node,
      message: cleanMsg,
    }).catch((err) => {
      console.warn(`[Support] Failed to dispatch admin inquiry email: ${err.message}`);
    });

    // 2. Dispatch automated technical answer back to the user's email
    sendSupportAutoReplyEmail({
      inquiryId,
      name: senderName,
      email: recipientEmail,
      category: cat,
      nodeId: node,
      message: cleanMsg,
    }).catch((err) => {
      console.warn(`[Support] Failed to dispatch user auto-reply email: ${err.message}`);
    });

    return res.status(200).json({
      success: true,
      inquiryId: `AG-SUP-${inquiryId}`,
      recipientEmail,
      message: `Inquiry ticket #AG-SUP-${inquiryId} submitted successfully. A notification has been sent to the AirGuard website mail (airguard396@gmail.com) and an automated answer has been dispatched to ${recipientEmail}.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

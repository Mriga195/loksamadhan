const nodemailer = require('nodemailer');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const DEFAULT_FROM = process.env.EMAIL_FROM || '"LokSamadhan Portal" <no-reply@loksamadhan.gov.in>';

// Reusable status styling tokens matching LokSamadhan frontend tokens
const STATUS_COLORS = {
  Submitted: { text: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Submitted' },
  Acknowledged: { text: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Acknowledged' },
  'In Progress': { text: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', label: 'In Progress' },
  'Pending Verification': { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', label: 'Pending Verification' },
  Resolved: { text: '#047857', bg: '#ecfdf5', border: '#a7f3d0', label: 'Resolved' },
  Rejected: { text: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Rejected' },
  Reopened: { text: '#c2410c', bg: '#fff7ed', border: '#fed7aa', label: 'Reopened' },
};

/**
 * Generates official canonical issue reference like LS-2026-61AB11
 */
function formatIssueRef(issue) {
  if (!issue) return 'LS-REPORT';
  const year = new Date(issue.createdAt || Date.now()).getFullYear();
  const hex = String(issue._id || issue.id || '').slice(-6).toUpperCase();
  return `LS-${year}-${hex}`;
}

let cachedTransporter = null;

/**
 * Dynamically get or create Nodemailer transporter based on current process.env
 */
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  const pass = rawPass ? String(rawPass).replace(/\s+/g, '') : '';

  if (!user || !pass) {
    return null;
  }

  // Create transporter with Gmail service or custom host
  if (process.env.EMAIL_SERVICE === 'gmail' || /@gmail\.com$/i.test(user)) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  } else {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
    });
  }

  return cachedTransporter;
}

/**
 * Base email layout wrapper with LokSamadhan Civic Theme
 */
function wrapCivicTemplate({ title, preheader, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 30px 10px;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      padding: 24px 28px;
      color: #ffffff;
      text-align: left;
    }
    .header-logo {
      display: inline-block;
      vertical-align: middle;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
    }
    .header-sub {
      margin-top: 4px;
      font-size: 12px;
      color: #bfdbfe;
      letter-spacing: 0.2px;
    }
    .body-content {
      padding: 28px 28px 24px 28px;
    }
    .footer {
      padding: 20px 28px;
      background-color: #f1f5f9;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .button-primary {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin: 18px 0;
    }
    .ref-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #e2e8f0;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${preheader || title}
  </div>
  <div class="wrapper">
    <div class="email-container">
      <!-- Civic Header -->
      <div class="header">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div class="header-logo">🏛️ LokSamadhan</div>
              <div class="header-sub">Public Grievance Redressal Portal • Government of Assam</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body -->
      <div class="body-content">
        ${contentHtml}
      </div>

      <!-- Official Footer -->
      <div class="footer">
        <p style="margin: 0 0 6px 0;">This is an automated administrative notification from the <strong>LokSamadhan Citizen Redressal System</strong>.</p>
        <p style="margin: 0 0 8px 0;">Please do not reply directly to this email. For assistance or follow-ups, visit the LokSamadhan Portal.</p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">© ${new Date().getFullYear()} LokSamadhan • Empowering Civic Transparency</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatch an email with graceful fallback to console logging
 */
async function sendMail({ to, subject, html, text }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.log('\n======================================================');
    console.log('📧 [LokSamadhan Email Fallback] (No SMTP configured)');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (text) console.log(`Content:\n${text}`);
    console.log('======================================================\n');
    return { messageId: 'simulated-dev-' + Date.now() };
  }

  const fromSender = process.env.EMAIL_USER
    ? `"LokSamadhan Portal" <${process.env.EMAIL_USER}>`
    : (process.env.EMAIL_FROM || DEFAULT_FROM);

  try {
    const info = await activeTransporter.sendMail({
      from: fromSender,
      to,
      subject,
      text: text || subject,
      html,
    });
    console.log(`[LokSamadhan Mailer] Real email dispatched to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[LokSamadhan Mailer] Error sending email to ${to}:`, err.message);
    return { error: err.message };
  }
}

/**
 * Send OTP Verification Email (Forgot Password or Signup)
 */
async function sendOtpEmail({ to, name = 'Citizen', otp, purpose = 'forgot-password' }) {
  const isForgot = purpose === 'forgot-password';
  const title = isForgot ? 'Password Reset Verification Code' : 'Email Verification Code';
  const preheader = `Your 6-digit verification code for LokSamadhan is ${otp}`;

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
      ${isForgot ? 'Reset Your Password' : 'Verify Your Email'}
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      ${
        isForgot
          ? 'We received a request to reset the password for your LokSamadhan account. Use the 6-digit one-time password (OTP) below to proceed:'
          : 'Thank you for registering on the LokSamadhan Civic Portal. Use the 6-digit verification code below to confirm your email:'
      }
    </p>

    <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; margin-bottom: 8px;">
        One-Time Verification Code
      </div>
      <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; font-family: ui-monospace, SFMono-Regular, monospace;">
        ${otp}
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Valid for <strong>10 minutes</strong>. Do not share this code with anyone.
      </div>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
      If you did not request this code, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  const html = wrapCivicTemplate({ title, preheader, contentHtml });
  const text = `LokSamadhan: Your verification code is ${otp}. Valid for 10 minutes.`;

  return sendMail({
    to,
    subject: `[LokSamadhan] ${title} — ${otp}`,
    html,
    text,
  });
}

/**
 * Send Acknowledgement Email when an issue is reported / raised
 */
async function sendIssueCreatedEmail({ to, citizenName = 'Citizen', issue }) {
  const ref = formatIssueRef(issue);
  const statusInfo = STATUS_COLORS[issue.status] || STATUS_COLORS.Submitted;
  const issueUrl = `${CLIENT_URL}/issues/${issue._id || issue.id}`;
  const title = `Grievance Registered: #${ref}`;
  const preheader = `Your grievance #${ref} (${issue.title}) has been registered with status: ${issue.status}.`;

  const contentHtml = `
    <div style="margin-bottom: 16px;">
      <span class="status-badge" style="background-color: ${statusInfo.bg}; color: ${statusInfo.text}; border: 1px solid ${statusInfo.border};">
        ${statusInfo.label}
      </span>
      <span style="float: right; margin-top: 2px;">
        <span class="ref-pill">#${ref}</span>
      </span>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
      Grievance Registered Successfully
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
      Dear <strong>${citizenName}</strong>, your civic report has been lodged in the LokSamadhan Grievance Redressal System and assigned the reference tracking ID <strong>${ref}</strong>.
    </p>

    <!-- Issue Snapshot Card -->
    <div class="info-card">
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="width: 32%; color: #64748b; font-weight: 600;">Issue Title:</td>
          <td style="font-weight: 600; color: #0f172a;">${issue.title}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Category:</td>
          <td>${issue.category || 'Civic'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Division / Region:</td>
          <td>${issue.region || 'General'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Department:</td>
          <td>${issue.department || 'Triage Pending'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Location:</td>
          <td>${issue.address || issue.area || 'Assam'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Lodged At:</td>
          <td>${new Date(issue.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #334155;">
      <strong>Current Status:</strong> ${issue.status}<br/>
      <span style="color: #64748b;">${
        issue.status === 'Acknowledged'
          ? 'Your report has been assigned to the relevant department and a field officer has been dispatched.'
          : 'Your report is currently queued for review by municipal triage officers.'
      }</span>
    </div>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${issueUrl}" class="button-primary" target="_blank">
        Track Grievance #${ref} →
      </a>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
      You can also track this anytime on <a href="${CLIENT_URL}" style="color: #2563eb;">${CLIENT_URL}</a> using reference code <strong>${ref}</strong>.
    </p>
  `;

  const html = wrapCivicTemplate({ title, preheader, contentHtml });
  const text = `LokSamadhan: Grievance #${ref} "${issue.title}" registered successfully with status: ${issue.status}. Track at: ${issueUrl}`;

  return sendMail({
    to,
    subject: `[LokSamadhan] Grievance Registered: #${ref} — ${issue.title}`,
    html,
    text,
  });
}

/**
 * Send Status Update Email to Citizen
 */
async function sendIssueStatusUpdateEmail({
  to,
  citizenName = 'Citizen',
  issue,
  newStatus,
  note = '',
  evidenceUrl = null,
}) {
  const ref = formatIssueRef(issue);
  const statusInfo = STATUS_COLORS[newStatus] || STATUS_COLORS.Submitted;
  const issueUrl = `${CLIENT_URL}/issues/${issue._id || issue.id}`;
  const title = `Status Update on #${ref}: ${newStatus}`;
  const preheader = `Your grievance #${ref} (${issue.title}) has been updated to ${newStatus}.`;

  const contentHtml = `
    <div style="margin-bottom: 16px;">
      <span class="status-badge" style="background-color: ${statusInfo.bg}; color: ${statusInfo.text}; border: 1px solid ${statusInfo.border};">
        ${statusInfo.label}
      </span>
      <span style="float: right; margin-top: 2px;">
        <span class="ref-pill">#${ref}</span>
      </span>
    </div>

    <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
      Grievance Status Updated
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
      Dear <strong>${citizenName}</strong>, the status of your reported grievance <strong>"${issue.title}"</strong> has been updated to <strong>${newStatus}</strong>.
    </p>

    <!-- Details Card -->
    <div class="info-card">
      <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="width: 30%; color: #64748b; font-weight: 600;">Reference ID:</td>
          <td style="font-weight: 700; color: #0f172a;">#${ref}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Title:</td>
          <td style="color: #0f172a;">${issue.title}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Department:</td>
          <td>${issue.department || 'Triage'} (${issue.region || 'General'} Division)</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">New Status:</td>
          <td><strong style="color: ${statusInfo.text};">${newStatus}</strong></td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Updated At:</td>
          <td>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
        </tr>
      </table>
    </div>

    ${
      note
        ? `
      <div style="background-color: #f8fafc; border-left: 4px solid ${statusInfo.text}; padding: 14px 16px; margin: 18px 0; border-radius: 0 8px 8px 0;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Officer / Administrative Remark:</div>
        <div style="font-size: 14px; line-height: 1.5; color: #1e293b;">${note}</div>
      </div>
      `
        : ''
    }

    ${
      evidenceUrl
        ? `
      <div style="margin: 16px 0; text-align: center;">
        <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px;">Resolution Verification Evidence:</div>
        <img src="${evidenceUrl}" alt="Resolution Proof" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; max-height: 250px;" />
      </div>
      `
        : ''
    }

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${issueUrl}" class="button-primary" target="_blank">
        View Full Timeline & Details →
      </a>
    </div>

    ${
      newStatus === 'Resolved' || newStatus === 'Pending Verification'
        ? `<p style="margin: 14px 0 0 0; font-size: 13px; color: #047857; text-align: center; font-weight: 500;">
            Thank you for bringing this issue to our attention and helping improve civic infrastructure!
          </p>`
        : ''
    }
  `;

  const html = wrapCivicTemplate({ title, preheader, contentHtml });
  const text = `LokSamadhan: Grievance #${ref} "${issue.title}" status updated to ${newStatus}. ${note ? `Note: ${note}. ` : ''}View at: ${issueUrl}`;

  return sendMail({
    to,
    subject: `[LokSamadhan] Status Update: #${ref} is now ${newStatus}`,
    html,
    text,
  });
}

module.exports = {
  getTransporter,
  formatIssueRef,
  sendOtpEmail,
  sendIssueCreatedEmail,
  sendIssueStatusUpdateEmail,
};

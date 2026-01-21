import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Logo path
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'gfg_logo.png');

// Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

/**
 * Send password reset email
 * @param {string} toEmail - Recipient email address
 * @param {string} teamName - Team name
 * @param {string} password - Temporary password
 */
export async function sendPasswordEmail(toEmail, teamName, password) {
  const mailOptions = {
    from: `"PCCOE AiMSA" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'DATATHON - Password Reset',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Password Reset</title>
      </head>
      <body style="
          margin: 0;
          padding: 0;
          background-color: #9a9a9a;
          font-family: Arial, Helvetica, sans-serif;
      ">
          <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                  <td align="center" style="padding: 40px 10px;">
                      <!-- MAIN CARD -->
                      <table
                          width="600"
                          cellpadding="0"
                          cellspacing="0"
                          style="
                              background: linear-gradient(135deg, #1b1b1b, #3a3a3a);
                              border-radius: 12px;
                              padding: 40px;
                              color: #ffffff;
                          "
                      >
                          <!-- LOGO -->
                          <tr>
                              <td align="center" style="padding-bottom: 30px;">
                                  <img
                                      src="cid:logo"
                                      width="160"
                                      alt="PCCOE GFG Student Chapter"
                                      style="display: block;"
                                  />
                              </td>
                          </tr>
                          
                          <!-- CONTENT -->
                          <tr>
                              <td style="font-size: 15px; line-height: 1.7;">
                                  <p style="margin: 0 0 20px 0;">
                                      <strong>Dear ${teamName},</strong>
                                  </p>
                                  
                                  <p style="margin: 0 0 18px 0;">
                                      You requested a password reset. Here is your temporary password:
                                  </p>

                                  <!-- PASSWORD BOX -->
                                  <table
                                      width="100%"
                                      cellpadding="20"
                                      cellspacing="0"
                                      style="
                                          background-color: #2b2b2b;
                                          border-radius: 8px;
                                          margin: 25px 0;
                                      "
                                  >
                                      <tr>
                                          <td style="font-size: 14px;">
                                              <strong>Email:</strong> ${toEmail}
                                          </td>
                                      </tr>
                                      <tr>
                                          <td style="font-size: 18px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                                              <strong>Temporary Password:</strong> <span style="color: #4CAF50;">${password}</span>
                                          </td>
                                      </tr>
                                  </table>

                                  <p style="margin: 20px 0 10px 0; color: #ff6b6b;">
                                      <strong>⚠️ Important:</strong>
                                  </p>

                                  <ul style="margin: 0 0 20px 18px; padding: 0;">
                                      <li>This is a temporary password</li>
                                      <li>Please change it immediately after logging in</li>
                                      <li>Do not share this password with anyone</li>
                                  </ul>

                                  <p style="margin: 25px 0 0 0; font-size: 14px;">
                                      If you didn't request this password reset, please contact us immediately.<br/><br/>
                                      Warm regards,<br />
                                      <strong>Team Datathon</strong>
                                  </p>
                              </td>
                          </tr>
                      </table>
                      <!-- END MAIN CARD -->
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `
  };

  // Add inline logo
  if (fs.existsSync(LOGO_PATH)) {
    mailOptions.attachments = [{
      filename: 'gfg_logo.png',
      path: LOGO_PATH,
      cid: 'logo'
    }];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send login credentials email
 * @param {string} toEmail - Recipient email address
 * @param {string} teamName - Team name
 * @param {string} leaderName - Leader name
 * @param {string} password - New password
 */
export async function sendCredentialEmail(toEmail, teamName, leaderName, password) {
  const mailOptions = {
    from: `"PCCOE AiMSA" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'DATATHON FINALE - Login Credentials',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Login Credentials</title></head>
      <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;">
              <tr>
                  <td align="center" style="padding:40px 20px;">
                      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
                          <tr>
                              <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:30px;text-align:center;">
                                  <img src="cid:logo" width="140" alt="PCCOE GFG" style="display:block;margin:0 auto;" />
                              </td>
                          </tr>
                          <tr>
                              <td style="padding:40px 35px;color:#1f2937;">
                                  <h2 style="margin:0 0 20px 0;color:#1e3a8a;font-size:24px;font-weight:600;">Welcome to DATATHON!</h2>
                                  <p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#374151;">Dear <strong>${leaderName}</strong>,</p>
                                  <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#374151;">Team: <strong>${teamName}</strong></p>
                                  <p style="margin:0 0 20px 0;font-size:15px;color:#6b7280;">Here are your login credentials to access the Datathon Finale platform:</p>
                                  <table width="100%" cellpadding="25" cellspacing="0" style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;margin:25px 0;">
                                      <tr>
                                          <td>
                                              <p style="margin:0 0 15px 0;font-size:15px;color:#374151;line-height:1.6;">
                                                  <span style="color:#6b7280;font-weight:600;">Email:</span> 
                                                  <span style="color:#1e3a8a;font-weight:500;">${toEmail}</span>
                                              </p>
                                              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
                                                  <span style="color:#6b7280;font-weight:600;">Password:</span> 
                                                  <span style="color:#059669;font-weight:700;font-family:monospace;">${password}</span>
                                              </p>
                                          </td>
                                      </tr>
                                  </table>
                                  <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px 20px;border-radius:6px;margin:25px 0;">
                                      <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">⚠️ Security Notice</p>
                                      <p style="margin:8px 0 0 0;color:#7f1d1d;font-size:14px;line-height:1.5;">Please change your password immediately after your first login for security purposes.</p>
                                  </div>
                                  <div style="background:#e7f3ff;border-left:4px solid #3b82f6;padding:15px 20px;border-radius:6px;margin:25px 0;">
                                      <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">🌐 Access the Platform</p>
                                      <p style="margin:8px 0 0 0;color:#1e40af;font-size:14px;line-height:1.5;">
                                          Visit: <a href="https://datathon.gfgpccoe.in/" style="color:#3b82f6;text-decoration:none;font-weight:600;">https://datathon.gfgpccoe.in/</a>
                                      </p>
                                  </div>
                                  <p style="margin:30px 0 0 0;font-size:15px;color:#6b7280;line-height:1.6;">Best wishes for the competition!</p>
                                  <p style="margin:10px 0 0 0;font-size:15px;color:#1e3a8a;font-weight:600;">Team Datathon</p>
                              </td>
                          </tr>
                          <tr>
                              <td style="background:#f9fafb;padding:20px 35px;text-align:center;border-top:1px solid #e5e7eb;">
                                  <p style="margin:0;font-size:13px;color:#9ca3af;">© 2026 PCCOE GeeksforGeeks. All rights reserved.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `
  };

  if (fs.existsSync(LOGO_PATH)) {
    mailOptions.attachments = [{ filename: 'gfg_logo.png', path: LOGO_PATH, cid: 'logo' }];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    throw new Error('Failed to send credentials email: ' + error.message);
  }
}

/**
 * Send welcome email to new team
 * @param {string} toEmail - Recipient email address
 * @param {string} teamName - Team name
 * @param {string} leaderName - Leader name
 */
export async function sendWelcomeEmail(toEmail, teamName, leaderName) {
  const mailOptions = {
    from: EMAIL_USER,
    to: toEmail,
    subject: 'Welcome to DATATHON Round Two!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Welcome to DATATHON!</h2>
        <p>Hello <strong>${leaderName}</strong>,</p>
        <p>Your team <strong>${teamName}</strong> has been successfully registered for DATATHON Round Two!</p>
        <p>You can now login using your email address and start competing.</p>
        <p style="margin-top: 30px;">Good luck! 🚀</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          For any questions, please contact the administrator.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
}

/**
 * Send custom email from admin to team leaders
 * @param {string[]} toEmails - Array of recipient email addresses
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML supported)
 * @param {Array} attachments - Optional array of attachment objects {filename, path}
 */
export async function sendCustomEmail(toEmails, subject, message, attachments = []) {
  const mailOptions = {
    from: `"PCCOE AiMSA" <${EMAIL_USER}>`,
    bcc: toEmails,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;">
              <tr>
                  <td align="center" style="padding:40px 20px;">
                      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
                          <tr>
                              <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:30px;text-align:center;">
                                  <img src="cid:logo" width="140" alt="PCCOE AiMSA" style="display:block;margin:0 auto;" />
                              </td>
                          </tr>
                          <tr>
                              <td style="padding:40px 35px;color:#1f2937;">
                                  <h2 style="margin:0 0 20px 0;color:#1e3a8a;font-size:24px;font-weight:600;">DATATHON Announcement</h2>
                                  <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#374151;">Dear Participant,</p>
                                  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#6b7280;">Greetings from <strong style="color:#1e3a8a;">PCCOE AiMSA</strong>!</p>
                                  <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;">
                                      <div style="font-size:15px;line-height:1.7;color:#374151;">
                                          ${message}
                                      </div>
                                  </div>
                                  <p style="margin:30px 0 0 0;font-size:15px;color:#6b7280;line-height:1.6;">Best wishes for the competition!</p>
                                  <p style="margin:10px 0 0 0;font-size:15px;color:#1e3a8a;font-weight:600;">Team Datathon</p>
                              </td>
                          </tr>
                          <tr>
                              <td style="background:#f9fafb;padding:20px 35px;text-align:center;border-top:1px solid #e5e7eb;">
                                  <p style="margin:0;font-size:13px;color:#9ca3af;">© 2026 PCCOE AiMSA. All rights reserved.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `
  };

  // Add attachments if provided
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  // Add inline logo
  if (fs.existsSync(LOGO_PATH)) {
    if (!mailOptions.attachments) {
      mailOptions.attachments = [];
    }
    mailOptions.attachments.push({
      filename: 'gfg_logo.png',
      path: LOGO_PATH,
      cid: 'logo' // Same CID as in HTML
    });
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Custom email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
}

/**
 * Send email to a single team leader
 * @param {string} toEmail - Recipient email address
 * @param {string} teamName - Team name
 * @param {string} subject - Email subject
 * @param {string} message - Email message (HTML supported)
 * @param {Array} attachments - Optional array of attachment objects {filename, path}
 */
export async function sendTeamEmail(toEmail, teamName, subject, message, attachments = []) {
  const mailOptions = {
    from: `"PCCOE AiMSA" <${EMAIL_USER}>`,
    to: toEmail,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;">
              <tr>
                  <td align="center" style="padding:40px 20px;">
                      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
                          <tr>
                              <td style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:30px;text-align:center;">
                                  <img src="cid:logo" width="140" alt="PCCOE AiMSA" style="display:block;margin:0 auto;" />
                              </td>
                          </tr>
                          <tr>
                              <td style="padding:40px 35px;color:#1f2937;">
                                  <h2 style="margin:0 0 20px 0;color:#1e3a8a;font-size:24px;font-weight:600;">DATATHON Update</h2>
                                  <p style="margin:0 0 10px 0;font-size:16px;line-height:1.6;color:#374151;">Dear Team,</p>
                                  <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#374151;"><strong>${teamName}</strong></p>
                                  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#6b7280;">Greetings from <strong style="color:#1e3a8a;">PCCOE AiMSA</strong>!</p>
                                  <div style="background:#f9fafb;border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;">
                                      <div style="font-size:15px;line-height:1.7;color:#374151;">
                                          ${message}
                                      </div>
                                  </div>
                                  <p style="margin:30px 0 0 0;font-size:15px;color:#6b7280;line-height:1.6;">Best wishes for the competition!</p>
                                  <p style="margin:10px 0 0 0;font-size:15px;color:#1e3a8a;font-weight:600;">Team Datathon</p>
                              </td>
                          </tr>
                          <tr>
                              <td style="background:#f9fafb;padding:20px 35px;text-align:center;border-top:1px solid #e5e7eb;">
                                  <p style="margin:0;font-size:13px;color:#9ca3af;">© 2026 PCCOE AiMSA. All rights reserved.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `
  };

  // Add attachments if provided
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  // Add inline logo
  if (fs.existsSync(LOGO_PATH)) {
    if (!mailOptions.attachments) {
      mailOptions.attachments = [];
    }
    mailOptions.attachments.push({
      filename: 'gfg_logo.png',
      path: LOGO_PATH,
      cid: 'logo' // Same CID as in HTML
    });
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Team email sent to', teamName, ':', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending team email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
}

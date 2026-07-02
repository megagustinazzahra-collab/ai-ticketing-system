const { APP_NAME, APP_URL } = process.env

const baseWrapper = (content) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .header { background: #1E3A5F; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { padding: 32px; color: #212529; line-height: 1.6; }
    .body p { margin: 0 0 16px; }
    .btn { display: inline-block; padding: 12px 28px; background: #00A651; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .footer { padding: 16px 32px; background: #f8f9fa; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>${APP_NAME || 'WMS Issue Ticketing'}</h1></div>
    <div class="body">${content}</div>
    <div class="footer">Email ini dikirim otomatis, harap tidak membalas.</div>
  </div>
</body>
</html>`

export const resetPasswordTemplate = (token) => ({
  subject: 'Reset Password — WMS Issue Ticketing',
  html: baseWrapper(`
    <p>Kami menerima permintaan reset password untuk akun Anda.</p>
    <p>Klik tombol di bawah untuk membuat password baru. Link ini berlaku selama <strong>24 jam</strong>.</p>
    <p style="text-align:center; margin: 28px 0;">
      <a href="${APP_URL}/change-password?token=${token}" class="btn">Reset Password</a>
    </p>
    <p>Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.</p>
  `),
})

export const ticketStatusTemplate = (ticket, newStatusLabel, reason) => ({
  subject: `Tiket ${ticket.ticket_number} — Status Diperbarui`,
  html: baseWrapper(`
    <p>Status tiket Anda telah diperbarui.</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      <tr><td style="padding:8px; border:1px solid #dee2e6; width:40%; background:#f8f9fa;"><strong>Nomor Tiket</strong></td><td style="padding:8px; border:1px solid #dee2e6;">${ticket.ticket_number}</td></tr>
      <tr><td style="padding:8px; border:1px solid #dee2e6; background:#f8f9fa;"><strong>Status Baru</strong></td><td style="padding:8px; border:1px solid #dee2e6;">${newStatusLabel}</td></tr>
      ${reason ? `<tr><td style="padding:8px; border:1px solid #dee2e6; background:#f8f9fa;"><strong>Alasan</strong></td><td style="padding:8px; border:1px solid #dee2e6;">${reason}</td></tr>` : ''}
    </table>
    <p style="text-align:center; margin: 28px 0;">
      <a href="${APP_URL}/tickets/${ticket.uuid}" class="btn">Lihat Tiket</a>
    </p>
  `),
})

export const slaBreachTemplate = (ticket) => ({
  subject: `⚠ SLA Breach: ${ticket.ticket_number}`,
  html: baseWrapper(`
    <p><strong>Peringatan:</strong> Tiket berikut telah melewati batas waktu SLA.</p>
    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      <tr><td style="padding:8px; border:1px solid #dee2e6; width:40%; background:#f8f9fa;"><strong>Nomor Tiket</strong></td><td style="padding:8px; border:1px solid #dee2e6;">${ticket.ticket_number}</td></tr>
      <tr><td style="padding:8px; border:1px solid #dee2e6; background:#f8f9fa;"><strong>Priority</strong></td><td style="padding:8px; border:1px solid #dee2e6;">${ticket.priority}</td></tr>
    </table>
    <p style="text-align:center; margin: 28px 0;">
      <a href="${APP_URL}/helpdesk/tickets/${ticket.uuid}" class="btn">Tangani Sekarang</a>
    </p>
  `),
})

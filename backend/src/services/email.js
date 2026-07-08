const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(to, name, resetUrl) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@atseller.io',
    to,
    subject: 'Redefinição de senha — ATSeller',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">ATSeller</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
        <a href="${resetUrl}" style="
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          margin: 16px 0;
        ">Redefinir senha</a>
        <p style="color: #6b7280; font-size: 13px;">
          Se você não solicitou isso, ignore este e-mail. Sua senha permanece a mesma.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };

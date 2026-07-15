import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.email.host || !config.email.user || !config.email.pass) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export async function sendCredentialsEmail(
  to: string,
  name: string,
  password: string
): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn('[EmailService] SMTP not configured, skipping email send');
    return false;
  }

  try {
    await t.sendMail({
      from: config.email.from,
      to,
      subject: 'TaskFlow AI - Panel Giriş Bilgileriniz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">TaskFlow AI Paneline Hoş Geldiniz!</h2>
          <p>Merhaba <strong>${name}</strong>,</p>
          <p>TaskFlow AI paneline erişim için hesabınız oluşturuldu. Aşağıdaki bilgilerle giriş yapabilirsiniz:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Giriş Adresi:</strong> ${config.clientUrl}</p>
            <p style="margin: 4px 0;"><strong>E-posta:</strong> ${to}</p>
            <p style="margin: 4px 0;"><strong>Şifre:</strong> ${password}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Güvenliğiniz için ilk girişten sonra şifrenizi değiştirmenizi öneririz.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayınız.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err);
    return false;
  }
}

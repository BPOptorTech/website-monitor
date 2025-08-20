import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async sendDowntimeAlert(monitorName: string, url: string, errorDetails: string, alertEmail: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL,
        to: alertEmail,
        subject: `🚨 ${monitorName} is DOWN`,
        html: `
          <h2>Website Down Alert</h2>
          <p><strong>${monitorName}</strong> is currently down.</p>
          <p><strong>URL:</strong> ${url}</p>
          <p><strong>Error:</strong> ${errorDetails}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p><small>Powered by Website Monitor</small></p>
        `
      });
      console.log(`Down alert sent for ${monitorName} to ${alertEmail}`);
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }
}
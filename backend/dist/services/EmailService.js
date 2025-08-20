"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    transporter;
    constructor(config) {
        this.transporter = nodemailer_1.default.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass
            }
        });
    }
    async sendDowntimeAlert(monitorName, url, errorDetails, alertEmail) {
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
        }
        catch (error) {
            console.error('Failed to send email alert:', error);
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map
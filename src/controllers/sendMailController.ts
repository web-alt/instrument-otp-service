import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';

class SendMailController {
  private transporter: Transporter;

  constructor() {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const user = (process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER) as string;
    const pass = (process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.SMTP_PASS) as string;

    if (host && !host.includes('gmail.com')) {
      this.transporter = nodemailer.createTransport({
        host: host,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_PORT === '465',
        auth: { user, pass },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }

  async sendMail(email: string, otp: string, organization: string, subject: string): Promise<void> {
    try {
      const sender = (process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@instrument.app') as string;
      const mailOptions = {
        from: `"${organization}" <${sender}>`,
        to: email,
        subject: subject,
        text: `Your OTP is ${otp}`,
        html: this.generateHtmlTemplate(otp, organization),
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Sent OTP to ${email}`);
    } catch (error: any) {
      logger.error(`Failed to send OTP to ${email}:`, error.message);
      throw new Error(`Failed to send OTP to ${email}`);
    }
  }

  private generateHtmlTemplate(otp: string, organization: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${organization} OTP</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f8f8f8;
                      margin: 0;
                      padding: 0;
                  }
                  .container {
                      max-width: 600px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      border-radius: 5px;
                      box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
                  }
                  .header {
                      background-color: #0073e6;
                      color: #ffffff;
                      padding: 20px;
                      text-align: center;
                      border-top-left-radius: 5px;
                      border-top-right-radius: 5px;
                  }
                  .content {
                      padding: 20px;
                      text-align: center;
                  }
                  .otp {
                      font-size: 32px;
                      font-weight: bold;
                      color: #0073e6;
                  }
                  .footer {
                      border: 1px dashed #cccccc;
                      border-width: 2px 0;
                      padding: 20px;
                      text-align: center;
                  }
                  .footer a {
                      color: #0073e6;
                  }
                  .footer a:hover {
                      text-decoration: underline;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>${organization}</h1>
                      <p style="font-size: 14px;color: #ffffff;">
                          You received this email because you requested an OTP.
                      </p>
                  </div>
                  <div class="content">
                      <p>Your One-Time Password (OTP) is:</p>
                      <p class="otp">${otp}</p>
                  </div>
                  <div class="footer">
                      <p>For more information, visit our GitHub repository:</p>
                      <p><a href="https://github.com/sauravhathi/otp-service" target="_blank">Saurav Hathi</a></p>
                  </div>
              </div>
          </body>
      </html>
    `;
  }
}

export default SendMailController;

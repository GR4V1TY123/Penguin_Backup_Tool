import nodemailer from 'nodemailer';
import config from "../config.json" with { type: "json" };
import { logger } from './logger.js';
import ora from 'ora';

// try {
//   await transporter.verify();
//   console.log("Server is ready to take our messages");
// } catch (err) {
//   console.error("Verification failed:", err);
// }

export const send_email = async (message) => {
    if (!config.user.options.notification.enabled) {
        return;
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    const mail_spinner = ora('Sending notification email...').start();
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER, // sender address
            to: config.user.options.notification.email, // list of recipients
            subject: message.subject, // subject line
            text: message.text, // plain text body
            html: message.html, // HTML body
        });
        logger.info('Notification email sent', {
            operation: "email notification",
            status: "success",
            message_id: info.messageId,
            suggestion: "Email notification sent successfully to " + config.user.options.notification.email
        });
        mail_spinner.succeed("Email sent successfully!");
    } catch (err) {
        logger.error('Error while sending mail', {
            operation: "email notification",
            status: "failure",
            error: err.message,
            suggestion: "Please check your email configuration and try again."
        });
        mail_spinner.fail("Failed to send email.");
    }
}
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";
import type { DetailBlock } from "../shared/types/index.js";

export class EmailService {
  private transporter: nodemailer.Transporter | null;

  constructor() {
    if (!ENV.EMAIL_NOTIFICATIONS_ENABLED) {
      this.transporter = null;
      return;
    }

    if (!ENV.SMTP_HOST || !ENV.SMTP_PORT || !ENV.SMTP_USER || !ENV.SMTP_PASS || !ENV.SMTP_FROM) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  }

  async sendTaskAssignedEmail(params: {
    to: string;
    recipientName: string;
    taskName: string;
    details: DetailBlock[];
    hours: number;
    status: string;
    startDate?: Date | null;
    dueDate?: Date | null;
  }): Promise<void> {
    if (!this.transporter) {
      return;
    }

    const escapeHtml = (value: string): string =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const formatDate = (date: Date | null | undefined): string | null =>
      date ? date.toDateString() : null;

    const lines: string[] = [];
    lines.push(`Hello ${params.recipientName},`);
    lines.push("");
    lines.push(`You have been assigned a new task: ${params.taskName}`);
    lines.push("");
    lines.push(`Status: ${params.status}`);
    lines.push(`Estimated hours: ${params.hours}`);

    if (params.startDate) {
      lines.push(`Start date: ${params.startDate.toDateString()}`);
    }

    if (params.dueDate) {
      lines.push(`Due date: ${params.dueDate.toDateString()}`);
    }

    if (params.details.length > 0) {
      lines.push("");
      lines.push("Details:");
      for (const detail of params.details) {
        lines.push(`- ${detail.time} ${detail.text}`);
      }
    }

    lines.push("");
    lines.push("Please log in to the Task Manager for updates.");

    const text = lines.join("\n");

    const safeRecipientName = escapeHtml(params.recipientName);
    const safeTaskName = escapeHtml(params.taskName);
    const safeStatus = escapeHtml(params.status);
    const safeHours = escapeHtml(String(params.hours));
    const safeStartDate = formatDate(params.startDate);
    const safeDueDate = formatDate(params.dueDate);

    const detailsHtml =
      params.details.length > 0
        ? `
          <div style="margin-top:16px;">
            <div style="font-weight:600; margin-bottom:8px;">Details</div>
            <ul style="margin:0; padding-left:18px; color:#1f2933;">
              ${params.details
                .map(
                  (detail) =>
                    `<li style="margin-bottom:6px;">${escapeHtml(detail.time)} ${escapeHtml(
                      detail.text,
                    )}</li>`,
                )
                .join("")}
            </ul>
          </div>
        `
        : "";

    const html = `
      <div style="background:#f7f7f9; padding:24px; font-family:Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; padding:24px; border:1px solid #e5e7eb;">
          <div style="font-size:18px; font-weight:700; color:#111827; margin-bottom:12px;">New task assigned</div>
          <div style="font-size:14px; color:#374151; margin-bottom:16px;">Hello ${safeRecipientName},</div>
          <div style="font-size:15px; color:#111827; margin-bottom:8px;">You have been assigned a new task:</div>
          <div style="font-size:16px; font-weight:600; color:#1f2933; margin-bottom:16px;">${safeTaskName}</div>

          <table style="width:100%; border-collapse:collapse; font-size:14px; color:#1f2933;">
            <tr>
              <td style="padding:8px 0; font-weight:600; width:160px;">Status</td>
              <td style="padding:8px 0;">${safeStatus}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-weight:600;">Estimated hours</td>
              <td style="padding:8px 0;">${safeHours}</td>
            </tr>
            ${safeStartDate ? `<tr><td style="padding:8px 0; font-weight:600;">Start date</td><td style="padding:8px 0;">${escapeHtml(safeStartDate)}</td></tr>` : ""}
            ${safeDueDate ? `<tr><td style="padding:8px 0; font-weight:600;">Due date</td><td style="padding:8px 0;">${escapeHtml(safeDueDate)}</td></tr>` : ""}
          </table>

          ${detailsHtml}

          <div style="margin-top:20px; font-size:13px; color:#6b7280;">
            Please log in to the Task Manager for updates.
          </div>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      to: params.to,
      from: ENV.SMTP_FROM,
      subject: `New task assigned: ${params.taskName}`,
      text,
      html,
    });
  }
}

import { storage } from '../storage';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@podlogix.app';

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(data: EmailData): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('Email skipped (SendGrid not configured):', data.subject);
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: data.to }] }],
        from: { email: FROM_EMAIL },
        subject: data.subject,
        content: [
          { type: 'text/plain', value: data.text },
          ...(data.html ? [{ type: 'text/html', value: data.html }] : []),
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      console.log('Email sent successfully:', data.subject);
      return true;
    } else {
      const errorText = await response.text();
      console.error('SendGrid error:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendNotificationEmail(
  userId: string,
  userEmail: string,
  notification: { type: string; title: string; message: string | null }
): Promise<boolean> {
  const subject = notification.title;
  const text = notification.message || notification.title;
  
  let html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">${notification.title}</h2>
      <p>${notification.message || ''}</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">
        You received this email from Podlogix. 
        <a href="${process.env.REPLIT_DOMAINS || 'https://podlogix.replit.app'}/listener">View in dashboard</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `[Podlogix] ${subject}`,
    text,
    html,
  });
}

export async function sendBriefingReadyEmail(
  userEmail: string,
  episodeTitle: string,
  briefingSummary: string
): Promise<boolean> {
  const subject = `Your briefing for "${episodeTitle}" is ready`;
  const text = `Your AI-generated briefing is ready to view.\n\nSummary:\n${briefingSummary}\n\nView the full briefing in your Podlogix dashboard.`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Your Briefing is Ready</h2>
      <p>Your AI-generated briefing for <strong>"${episodeTitle}"</strong> is ready to view.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0;">Summary Preview</h4>
        <p style="margin: 0; color: #666;">${briefingSummary.slice(0, 300)}${briefingSummary.length > 300 ? '...' : ''}</p>
      </div>
      <a href="${process.env.REPLIT_DOMAINS || 'https://podlogix.replit.app'}/listener" 
         style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Full Briefing
      </a>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">
        You received this email because you subscribed to podcast notifications on Podlogix.
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `[Podlogix] ${subject}`,
    text,
    html,
  });
}

export async function sendNewEpisodeEmail(
  userEmail: string,
  podcastTitle: string,
  episodeTitle: string
): Promise<boolean> {
  const subject = `New episode from ${podcastTitle}`;
  const text = `A new episode "${episodeTitle}" has been published by ${podcastTitle}.\n\nOpen Podlogix to transcribe and generate your personalized briefing.`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">New Episode Available</h2>
      <p>A new episode has been published:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #333;">${episodeTitle}</p>
        <p style="margin: 4px 0 0 0; color: #666;">from ${podcastTitle}</p>
      </div>
      <a href="${process.env.REPLIT_DOMAINS || 'https://podlogix.replit.app'}/listener" 
         style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Listen & Generate Briefing
      </a>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="color: #888; font-size: 12px;">
        You received this email because you subscribed to ${podcastTitle} on Podlogix.
      </p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `[Podlogix] ${subject}`,
    text,
    html,
  });
}

export function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

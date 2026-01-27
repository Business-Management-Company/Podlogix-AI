// Email service using Resend integration (connection:conn_resend_01KFE51C5FCFKKVDNWAZ87Q7TS)
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const result = await client.emails.send({
      from: fromEmail || 'Podlogix <notifications@podlogix.app>',
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return false;
    }

    console.log('Email sent successfully:', data.subject);
    return true;
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
  
  const html = `
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

export async function isEmailConfigured(): Promise<boolean> {
  try {
    await getCredentials();
    return true;
  } catch {
    return false;
  }
}

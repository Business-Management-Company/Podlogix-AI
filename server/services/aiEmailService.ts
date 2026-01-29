import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EmailGenerationParams {
  purpose: 'guest_invite' | 'newsletter' | 'thank_you' | 'follow_up' | 'custom';
  recipientName?: string;
  recipientEmail?: string;
  podcastName?: string;
  episodeTopic?: string;
  customPrompt?: string;
  tone?: 'professional' | 'friendly' | 'casual' | 'formal';
  senderName?: string;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  plainText: string;
}

const purposePrompts: Record<string, string> = {
  guest_invite: `Write a professional email inviting someone to be a guest on a podcast. Include:
- A warm greeting
- Brief introduction of the podcast
- Why they would be a great guest
- What topics you'd like to discuss
- A clear call to action to schedule`,
  
  newsletter: `Write an engaging newsletter update for podcast subscribers. Include:
- Exciting news about the podcast
- Recent episodes or upcoming content
- Personal touch from the host
- Call to action to listen or share`,
  
  thank_you: `Write a heartfelt thank you email to a podcast guest. Include:
- Genuine appreciation for their time
- Specific mention of valuable insights they shared
- Information about when the episode will air
- Invitation to share with their audience`,
  
  follow_up: `Write a professional follow-up email. Include:
- Reference to previous contact
- Gentle reminder of the purpose
- Updated information if relevant
- Clear next steps`,
  
  custom: `Write a professional email based on the user's specific request.`,
};

export async function generateEmailWithAI(params: EmailGenerationParams): Promise<GeneratedEmail> {
  const {
    purpose,
    recipientName,
    podcastName,
    episodeTopic,
    customPrompt,
    tone = 'professional',
    senderName,
  } = params;

  const basePrompt = purposePrompts[purpose] || purposePrompts.custom;
  
  const contextParts: string[] = [];
  if (podcastName) contextParts.push(`Podcast name: ${podcastName}`);
  if (recipientName) contextParts.push(`Recipient name: ${recipientName}`);
  if (episodeTopic) contextParts.push(`Episode topic: ${episodeTopic}`);
  if (senderName) contextParts.push(`Sender name: ${senderName}`);
  if (customPrompt) contextParts.push(`Additional context: ${customPrompt}`);

  const systemPrompt = `You are an expert email copywriter for podcasters. Write emails that are ${tone}, engaging, and concise. 
Always use proper email formatting with clear paragraphs. 
Return your response in the following JSON format:
{
  "subject": "Email subject line",
  "body": "HTML formatted email body with <p>, <strong>, and <br> tags",
  "plainText": "Plain text version of the email"
}`;

  const userPrompt = `${basePrompt}

Context:
${contextParts.join('\n')}

Generate a compelling email that sounds natural and personable.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as GeneratedEmail;
    return result;
  } catch (error) {
    console.error('AI email generation error:', error);
    throw new Error('Failed to generate email');
  }
}

export async function improveEmailWithAI(
  currentSubject: string,
  currentBody: string,
  instruction: string
): Promise<GeneratedEmail> {
  const systemPrompt = `You are an expert email copywriter. Your job is to improve emails based on user feedback.
Return your response in the following JSON format:
{
  "subject": "Improved email subject line",
  "body": "Improved HTML formatted email body",
  "plainText": "Plain text version of the improved email"
}`;

  const userPrompt = `Please improve this email based on the following instruction:

Current Subject: ${currentSubject}
Current Body: ${currentBody}

Instruction: ${instruction}

Provide an improved version that addresses the instruction while maintaining the email's purpose.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content) as GeneratedEmail;
  } catch (error) {
    console.error('AI email improvement error:', error);
    throw new Error('Failed to improve email');
  }
}

export async function generateSubjectLines(
  emailBody: string,
  count: number = 5
): Promise<string[]> {
  const systemPrompt = `You are an expert email copywriter specializing in subject lines.
Generate compelling subject lines that increase open rates.
Return your response in the following JSON format:
{
  "subjects": ["Subject 1", "Subject 2", "Subject 3", "Subject 4", "Subject 5"]
}`;

  const userPrompt = `Generate ${count} compelling subject line options for this email:

${emailBody}

Create varied options: some short and punchy, some with personalization, some curiosity-driven.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content);
    return result.subjects || [];
  } catch (error) {
    console.error('AI subject generation error:', error);
    throw new Error('Failed to generate subject lines');
  }
}

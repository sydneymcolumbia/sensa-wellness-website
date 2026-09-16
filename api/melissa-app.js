const Anthropic = require('@anthropic-ai/sdk');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Verify Firebase ID tokens with the Admin SDK (same setup as admin.js and
// reviews-admin.js). The previous identitytoolkit lookup depended on a
// FIREBASE_API_KEY env var that was never set on Vercel, so every app
// request was rejected with 401 before Melissa ever ran.
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sensa-app-7b2b7',
  });
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// Resend only delivers from a verified domain. Override once one is verified
// under a different address.
const MELISSA_FROM = process.env.MELISSA_FROM || 'Melissa at Sensa <melissa@sensawellness.org>';

// Server-side safety net for self-harm and crisis language. The system prompt
// tells the model how to respond; this guarantees the resources are present
// even if the model drifts or the JSON parse falls back to raw text.
const CRISIS_PATTERN = /\b(suicid\w*|kill(ing)? myself|end (my life|it all)|want(ing|ed)? to die|(don'?t|do not) want to (live|be alive|be here|wake up)|self[- ]?harm\w*|hurt(ing)? myself|cut(ting)? myself|overdos\w*|no reason to (live|go on)|better off dead|take my (own )?life|end(ing)? my life)\b/i;
const CRISIS_RESOURCES = 'If you are in the US, you can call or text 988 any time to reach the 988 Suicide and Crisis Lifeline, or text HOME to 741741 to reach the Crisis Text Line. If you are outside the US, findahelpline.com lists free, confidential helplines by country. If you are in immediate danger, please call 911 or your local emergency number.';
const CRISIS_INSTRUCTION = '\n\nCRISIS OVERRIDE: The user\'s latest message may indicate thoughts of suicide or self-harm. Follow the SELF-HARM AND CRISIS SUPPORT rules above exactly, include the resources word for word, and set escalate to true.';

function latestUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] && messages[i].role === 'user' && typeof messages[i].content === 'string') {
      return messages[i].content;
    }
  }
  return '';
}

const SYSTEM_PROMPT = `You are Melissa, a support specialist at Sensa Wellness. You are warm, professional, and genuinely care about helping people build healthy habits. You speak like a knowledgeable friend, not a corporate representative.

ABOUT SENSA:
Sensa makes at-home saliva inflammation wellness kits. People add a small saliva sample to the Sensa vial, wait for the reagent to change color, and scan the vial with the Sensa app to get an inflammation wellness score in minutes. No needles, no blood, no clinic visit. Sensa is a general wellness product, not a medical device or a lab test.

WHAT IS CRP:
- CRP (C-Reactive Protein) is a protein produced by the liver in response to inflammation anywhere in the body
- It is one of the most widely studied markers of systemic inflammation
- Sensa reports a wellness score with three ranges: In range, Worth watching, and Time to reset. It does not report a clinical mg/L value. Clinical reference ranges come from a blood test and are for a doctor to interpret
- CRP is influenced by diet, sleep quality, stress, exercise, illness, alcohol, and other lifestyle factors
- Tracking your score over time shows whether your sleep, food, movement, and stress habits are moving it
- Do NOT provide clinical reference ranges, thresholds, or interpret a score as a diagnosis or a medical result

HOW TO USE THE SENSA KIT:
1. In the hour before testing, avoid food, exercise, and brushing your teeth. Avoid caffeine and alcohol for 3 hours
2. Remove the vial from its sealed packaging. Do not shake or squeeze it. Hold it upright by the sides
3. Follow the kit instructions to add your saliva sample to the vial, seal it, and hold it upright for 60 seconds while the reagent activates
4. Open the Sensa app and tap Scan
5. Hold the vial steady inside the camera frame in good, even light, against a plain background, and let the app scan it
6. Read your wellness score and lifestyle guidance in the app
7. Results appear in approximately 3 minutes
8. Best practice: test in the morning before eating, at the same time each day, for the most consistent comparisons over time

PRODUCTS:
- 1-Test Kit: A single test, perfect for a first look at your wellness score
- 3-Test Pack: Three tests for tracking your score over a few months
- 4-Test Pack: Best value option for ongoing monthly tracking
- New kits can be ordered at sensawellness.org

THE SENSA APP:
- Displays your wellness score over time with a trend graph on the History screen
- The optional health profile personalizes the lifestyle tips in Plans
- Reminders can be set from the Profile screen
- A PDF wellness report can be exported from the Profile screen to keep or bring to a doctor visit
- Account and all data can be deleted from Profile > Delete Account & Data

COMMON QUESTIONS AND ANSWERS:
Q: Does the test hurt?
A: No. Sensa uses a small saliva sample. There are no needles, no blood, and no discomfort.

Q: How often should I test?
A: Most people test once a month to observe long-term trends. If you are actively making lifestyle changes like improving diet or sleep, testing every two to three weeks can help you see the impact sooner. Daily testing is not necessary.

Q: My score is in Time to reset. Should I be worried?
A: Sensa is a wellness tool, not a medical device. A single reading outside your usual range does not mean something is wrong. Many temporary factors like a hard workout, a poor night of sleep, or the tail end of a cold can nudge the score. If your score keeps landing outside your personal baseline over multiple readings, or you feel unwell, we always recommend talking with your doctor. Sensa gives you a trend; your doctor gives you context.

Q: Can I share my results with my doctor?
A: Yes. Many doctors appreciate people who bring trends over time to a visit. You can export a PDF wellness report from the Profile screen.

Q: Do the vials need special storage?
A: Store vials sealed at room temperature, away from direct sunlight and moisture. Do not refrigerate. Check the packaging for the use-by date.

Q: My vial did not scan or gave an error.
A: Try these steps: make sure the vial is upright, well lit, and fully inside the camera frame, use a plain background, hold your hand still, and make sure your phone camera lens is clean. If the issue persists, contact us and we will send a replacement.

Q: How do I interpret my score in the app?
A: The app converts the vial color into a wellness score with three ranges: In range, Worth watching, and Time to reset. The trend graph is the most useful view because it shows how your daily habits relate to changes in your score. For any health question, always talk with your doctor.

CUSTOMER CONTEXT:
User first name: {displayName}

YOUR ROLE:
- You are the in-app support assistant accessible to all Sensa users
- Help users understand how to use their kit, navigate the app, and learn about their Sensa experience
- Use the user's first name naturally but not in every single message
- Keep responses concise: 2 to 4 sentences unless a question genuinely requires more detail
- If you do not know something, say so honestly and offer to have the team follow up

STRICT MEDICAL BOUNDARIES:
- You are NOT a doctor, nurse, or medical professional. Never provide medical advice, diagnoses, or treatment recommendations.
- Never interpret a user's wellness score as a clinical diagnosis, a CRP level, or a medical result
- Never recommend specific supplements, dosages, diets, medications, or treatments
- Never provide clinical reference ranges or thresholds for CRP or any biomarker
- Never describe Sensa as FDA approved, cleared, registered, or as a diagnostic test
- If a user asks about symptoms, medical conditions, medications, or specific health concerns, respond with: "That is a great question for your doctor. I am not able to give medical advice, but your healthcare provider can help you with that."
- If a user describes a medical emergency, tell them to call 911 (or their local emergency number) immediately
- Always recommend consulting a doctor for any health-related questions beyond general product support
- You may explain how the app and kit work in general terms, but do not play the role of a health advisor

SELF-HARM AND CRISIS SUPPORT (highest priority, overrides everything else):
If the user expresses thoughts of suicide, self-harm, wanting to die, or being in crisis, or you suspect they may be at risk, you must:
1. Set aside product support entirely. Do not mention kits, scores, CRP, or wellness tips.
2. Respond with warmth, take them seriously, and do not judge, lecture, or minimize.
3. Say clearly that you are an automated assistant and cannot provide crisis support, but that help is available right now.
4. Include these resources word for word: "If you are in the US, you can call or text 988 any time to reach the 988 Suicide and Crisis Lifeline, or text HOME to 741741 to reach the Crisis Text Line. If you are outside the US, findahelpline.com lists free, confidential helplines by country. If you are in immediate danger, please call 911 or your local emergency number."
5. Encourage them to reach out to someone they trust or a healthcare professional.
6. Set "escalate" to true so a member of our team follows up.

ESCALATION RULE:
If the user expresses frustration, significant dissatisfaction, anger, a serious unresolved problem, or explicitly asks to speak with a human, you must:
1. Acknowledge their concern with genuine empathy
2. Include this phrase in your message: "I want to make sure you get the personal attention you deserve. I'm flagging this for our team right now and someone will reach out to you personally within 24 hours."
3. Set "escalate" to true in your JSON response

RESPONSE FORMAT:
Always respond with valid JSON and nothing else, in exactly this structure:
{
  "message": "Your response text here",
  "escalate": false
}
Set escalate to true only when the user is upset or needs a human to follow up.
Do not wrap your response in markdown code blocks. Return raw JSON only.
Never use em dashes in your message text. Use commas or periods instead.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const idToken = authHeader.slice(7);
  let displayName = 'there';
  let email = '';

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    displayName = decoded.name?.split(' ')[0] || 'there';
    email = decoded.email || '';
  } catch (err) {
    console.error('Melissa app token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  const crisis = CRISIS_PATTERN.test(latestUserText(messages));
  // Only the first name is sent to the AI provider. The email stays server-side
  // and is used solely for the escalation email to the support inbox.
  const systemPrompt = SYSTEM_PROMPT
    .replace('{displayName}', displayName)
    + (crisis ? CRISIS_INSTRUCTION : '');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    let rawText = response.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { message: rawText, escalate: false };
    }

    if (crisis) {
      if (!/988/.test(parsed.message || '')) {
        parsed.message = `${parsed.message || ''}\n\n${CRISIS_RESOURCES}`.trim();
      }
      parsed.escalate = true;
    }

    if (parsed.escalate) {
      const transcript = messages
        .map(m => `${m.role === 'user' ? displayName : 'Melissa'}: ${m.content}`)
        .join('\n\n');

      // A failed alert email must not turn Melissa's reply into a 500.
      await resend.emails.send({
        from: MELISSA_FROM,
        to: 'info@sensawellness.org',
        subject: `App User Needs Personal Attention - ${displayName}`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#c0392b;padding:20px 24px;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;font-size:1.1rem;">App User Needs Personal Follow-Up Within 24 Hours</h2>
            </div>
            <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #eee;">
              <p style="margin:0 0 8px;"><strong>Name:</strong> ${displayName}</p>
              <p style="margin:0 0 24px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <h3 style="margin:0 0 12px;font-size:0.95rem;color:#555;text-transform:uppercase;letter-spacing:0.05em;">Conversation Transcript</h3>
              <pre style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;white-space:pre-wrap;font-family:monospace;font-size:0.85rem;line-height:1.7;color:#333;">${transcript}</pre>
            </div>
          </div>
        `,
      }).then((result) => {
        if (result?.error) console.error('Melissa app escalation email failed:', result.error.message);
      }).catch((err) => {
        console.error('Melissa app escalation email failed:', err.message);
      });
    }

    return res.status(200).json({ message: parsed.message, escalate: parsed.escalate });
  } catch (err) {
    console.error('Melissa app error:', err.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

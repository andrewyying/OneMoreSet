const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_IMAGE_BASE64_LENGTH = 4_200_000;
const MAX_IMAGES = 5;
const BASE64_PATTERN = /^[A-Za-z0-9+/=]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });

const cleanString = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);

const normalizeBase64 = (value) =>
  typeof value === 'string' ? value.trim().replace(/^data:[^,]+,/, '').replace(/\s+/g, '') : '';

const asRecord = (value) => (typeof value === 'object' && value !== null ? value : null);

const sanitizeFilename = (value) => {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned || `attachment-${Date.now()}.jpg`;
};

const isFeedbackType = (value) => value === 'feedback' || value === 'bug_report';

const parsePayload = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const buildEmailBody = (appName, payload) => {
  const lines = [
    `App: ${appName}`,
    `Type: ${payload.type}`,
    `Name: ${payload.name || 'not provided'}`,
    `Platform: ${payload.platform || 'unknown'}`,
    `OS: ${payload.osVersion || 'unknown'}`,
    `App Version: ${payload.appVersion || 'unknown'}`,
    `Device: ${payload.deviceModel || 'unknown'}`,
    `User ID: ${payload.userId || 'unknown'}`,
    `Email: ${payload.email || 'not provided'}`,
    `Attachments: ${payload.images?.length ? `${payload.images.length} included` : 'not provided'}`,
  ];

  if (payload.type === 'feedback') {
    lines.push('', 'Feature Request:', payload.featureRequest || 'not provided');
  }

  lines.push('', payload.type === 'bug_report' ? 'Issue Details:' : 'Message:', payload.message);

  const text = lines.join('\n');
  const html = `<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace">${escapeHtml(
    text,
  )}</pre>`;

  return { text, html };
};

const sendWithResend = async (env, subject, text, html, replyTo, images) => {
  const emailPayload = {
    from: env.RESEND_FROM_EMAIL,
    to: [env.RESEND_TO_EMAIL],
    reply_to: replyTo || undefined,
    subject,
    text,
    html,
  };

  if (images.length > 0) {
    emailPayload.attachments = images.map((image) => ({
      filename: image.filename,
      content: image.base64,
      content_type: image.mimeType,
    }));
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResponse.ok) {
    return {
      ok: false,
      status: resendResponse.status,
      detail: await resendResponse.text(),
    };
  }

  const data = await resendResponse.json();
  return { ok: true, id: data.id ?? null };
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json(200, { ok: true });
    }

    if (url.pathname !== '/feedback' || request.method !== 'POST') {
      return json(404, { error: 'Not found' });
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.RESEND_TO_EMAIL) {
      return json(500, { error: 'Missing required worker configuration' });
    }

    const rawPayload = await parsePayload(request);
    if (!rawPayload) {
      return json(400, { error: 'Invalid JSON body' });
    }

    const type = cleanString(rawPayload.type, 20);
    const name = cleanString(rawPayload.name, 120);
    const message = cleanString(rawPayload.message, 5000);
    const featureRequest = cleanString(rawPayload.featureRequest, 2000);
    const email = cleanString(rawPayload.email, 200);
    const appVersion = cleanString(rawPayload.appVersion, 50);
    const platform = cleanString(rawPayload.platform, 20);
    const osVersion = cleanString(rawPayload.osVersion, 50);
    const deviceModel = cleanString(rawPayload.deviceModel, 100);
    const userId = cleanString(rawPayload.userId, 100);
    const singleImagePayload = asRecord(rawPayload.image);
    const imagesPayload = Array.isArray(rawPayload.images)
      ? rawPayload.images.map(asRecord).filter(Boolean)
      : [];
    const imageCandidates =
      imagesPayload.length > 0 ? imagesPayload : singleImagePayload ? [singleImagePayload] : [];

    if (!isFeedbackType(type)) {
      return json(400, { error: "type must be 'feedback' or 'bug_report'" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return json(400, { error: 'email must be valid' });
    }

    if (message.length < 5) {
      return json(400, { error: 'message must be at least 5 characters' });
    }

    const appName = cleanString(env.APP_NAME, 100) || 'OneMoreSet';
    const kind = type === 'bug_report' ? 'BUG' : 'FEEDBACK';
    const subject = `[${appName}] ${kind}${platform ? ` (${platform})` : ''}`;

    if (imageCandidates.length > MAX_IMAGES) {
      return json(400, { error: `too many images (max ${MAX_IMAGES})` });
    }

    let images = [];
    for (const imagePayload of imageCandidates) {
      const imageBase64 = normalizeBase64(imagePayload.base64);
      if (!imageBase64) {
        continue;
      }

      if (type !== 'bug_report') {
        return json(400, { error: 'image attachments are only allowed for bug_report' });
      }

      if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
        return json(400, { error: 'image is too large (max 3 MB each)' });
      }

      if (!BASE64_PATTERN.test(imageBase64)) {
        return json(400, { error: 'image must be valid base64 data' });
      }

      images.push({
        filename: sanitizeFilename(cleanString(imagePayload.filename, 120)),
        mimeType: cleanString(imagePayload.mimeType, 100) || 'application/octet-stream',
        base64: imageBase64,
      });
    }

    const normalizedPayload = {
      type,
      name,
      message,
      featureRequest,
      email,
      appVersion,
      platform,
      osVersion,
      deviceModel,
      userId,
      images,
    };

    const { text, html } = buildEmailBody(appName, normalizedPayload);
    const sendResult = await sendWithResend(env, subject, text, html, email, images);

    if (!sendResult.ok) {
      console.error('Resend API error', sendResult.status, sendResult.detail);
      return json(502, {
        error: 'Unable to deliver email',
        providerStatus: sendResult.status,
      });
    }

    return json(202, { ok: true, id: sendResult.id });
  },
};

const sanitizePakistanWhatsAppNumber = (phoneNumber = '') => {
  const digitsWithoutLeadingZero = String(phoneNumber).replace(/\D/g, '').replace(/^0+/, '');
  return digitsWithoutLeadingZero.startsWith('92')
    ? digitsWithoutLeadingZero
    : `92${digitsWithoutLeadingZero}`;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({
      error: 'WhatsApp Cloud API is not configured',
      details: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel environment variables.',
    });
  }

  const { to, message } = req.body || {};
  const sanitizedPhone = sanitizePakistanWhatsAppNumber(to);

  if (!/^92\d+$/.test(sanitizedPhone)) {
    return res.status(400).json({
      error: 'Invalid WhatsApp number',
      details: 'Phone number must resolve to digits only and start with 92.',
    });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message body is required' });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: sanitizedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('WhatsApp Cloud API response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    });

    return res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    });
  } catch (error) {
    console.log('WhatsApp Cloud API response:', error);
    return res.status(500).json({
      ok: false,
      error: 'Failed to send WhatsApp message',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

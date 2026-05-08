const sanitizePakistanWhatsAppNumber = (phoneNumber = '') => {
  const digits = String(phoneNumber).replace(/\D/g, '');
  if (/^03\d{9}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  if (/^0\d{10}$/.test(digits)) {
    return `92${digits.slice(1)}`;
  }
  if (/^92\d{10}$/.test(digits)) {
    return digits;
  }
  if (/^923\d{9}$/.test(digits)) {
    return digits;
  }
  return digits;
};

module.exports = async function handler(req, res) {
  console.log('send-whatsapp handler invoked:', req.method);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Allow', 'POST,OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const apiVersion = String(process.env.WHATSAPP_API_VERSION || 'v20.0').trim();

  console.log('WhatsApp send config:', {
    accessTokenPresent: Boolean(accessToken),
    phoneNumberId: phoneNumberId ? `***${phoneNumberId.slice(-4)}` : null,
    apiVersion,
  });

  if (!accessToken || !phoneNumberId) {
    return res.status(500).json({
      error: 'WhatsApp Cloud API is not configured',
      details: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel environment variables.',
    });
  }

  const { to, message } = req.body || {};
  const sanitizedPhone = sanitizePakistanWhatsAppNumber(to);

  if (!/^923\d{9}$/.test(sanitizedPhone)) {
    return res.status(400).json({
      error: 'Invalid WhatsApp number',
      details: 'Phone number must be a valid Pakistani WhatsApp number in the 923xxxxxxxxx format.',
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

  console.log('WhatsApp Cloud API request payload:', {
    apiVersion,
    phoneNumberId: `***${phoneNumberId.slice(-4)}`,
    to: sanitizedPhone,
    payload,
  });

  const parseJsonBody = async response => {
    try {
      return await response.json();
    } catch (parseError) {
      return {
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        rawText: await response.text(),
      };
    }
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

    const data = await parseJsonBody(response);

    console.log('WhatsApp Cloud API response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    });

    if (response.ok) {
      console.log('✅ WhatsApp message sent successfully to', sanitizedPhone);
      return res.status(200).json({
        success: true,
        message: 'WhatsApp message sent successfully',
        data,
      });
    } else {
      console.error('❌ WhatsApp Cloud API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      return res.status(502).json({
        success: false,
        error: 'WhatsApp Cloud API returned an error',
        details: data,
      });
    }
  } catch (error) {
    console.error('❌ WhatsApp Cloud API request failed:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp message',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

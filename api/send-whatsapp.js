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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
      const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
      const apiVersion = String(process.env.WHATSAPP_API_VERSION || 'v20.0').trim();

      if (!accessToken || !phoneNumberId) {
        return res.status(500).json({
          success: false,
          message: 'WhatsApp Cloud API is not configured',
          details: 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel environment variables.',
        });
      }

      const { to, message } = req.body || {};
      const sanitizedPhone = sanitizePakistanWhatsAppNumber(to);

      if (!/^923\d{9}$/.test(sanitizedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid WhatsApp number',
          details: 'Phone number must be a valid Pakistani WhatsApp number in the 923xxxxxxxxx format.',
        });
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Message body is required',
        });
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

      const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch {
        data = { rawText: responseBody };
      }

      if (response.ok) {
        return res.status(200).json({
          success: true,
          message: 'Message Sent!',
          data,
        });
      }

      return res.status(502).json({
        success: false,
        message: 'WhatsApp Cloud API returned an error',
        details: data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  res.status(405).json({ message: 'Only POST is allowed' });
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ success: true, message: 'Preflight OK' });
    return;
  }

  return res.status(200).json({
    success: true,
    message: 'send-whatsapp test endpoint is live',
    method: req.method,
  });
}


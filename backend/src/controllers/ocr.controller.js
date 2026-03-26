import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function processReceipt(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'OCR no configurado. Agrega ANTHROPIC_API_KEY en el .env' });
  }

  try {
    const base64    = req.file.buffer.toString('base64');
    const mimeType  = req.file.mimetype || 'image/jpeg';

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `Analiza este recibo/factura y extrae los datos en JSON con exactamente este formato:
{
  "merchant": "nombre del comercio o null",
  "amount": número total (sin símbolo de moneda, solo el número) o null,
  "date": "YYYY-MM-DD" o null,
  "currency": "código de moneda (USD, GTQ, MXN, etc.) o null",
  "line_items": [
    { "description": "nombre del producto", "amount": número o null, "quantity": "cantidad o vacío" }
  ]
}
Responde SOLO con el JSON, sin texto adicional.`,
          },
        ],
      }],
    });

    const raw = message.content[0]?.text?.trim() || '{}';

    // Extraer JSON aunque Claude agregue markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const parsed = JSON.parse(jsonMatch[1].trim());

    res.json({
      merchant:   parsed.merchant   || null,
      amount:     parsed.amount     ? +parseFloat(parsed.amount).toFixed(2) : null,
      date:       parsed.date       || null,
      currency:   parsed.currency   || null,
      line_items: parsed.line_items || [],
    });
  } catch (err) {
    console.error('Claude OCR error:', err.message);
    res.status(500).json({ error: 'Error al procesar el recibo: ' + err.message });
  }
}

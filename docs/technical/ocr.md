# OCR de recibos

## Descripción

El módulo OCR permite fotografiar o subir un recibo y extraer automáticamente los datos relevantes (comercio, monto, fecha, productos) usando la API de Anthropic con el modelo **Claude Haiku**.

---

## Flujo completo

```
Usuario selecciona imagen/PDF
      ↓
Frontend comprime la imagen (máx 1920px, JPEG 82%, respeta EXIF)
      ↓
POST /api/ocr/receipt (multipart/form-data, campo "receipt")
      ↓
Multer valida tipo (image/* | application/pdf) y tamaño (máx 10 MB)
      ↓
Controller convierte a base64
      ↓
Llamada a Anthropic API (Claude Haiku, modelo vision)
      ↓
Parseo de respuesta JSON
      ↓
{ merchant, amount, date, currency, line_items }
      ↓
Frontend pre-rellena el formulario de nueva transacción
```

---

## Costo estimado

| Proveedor | Costo por imagen |
|-----------|-----------------|
| Google Document AI | ~$0.10 |
| **Claude Haiku (actual)** | **~$0.0004** |

Claude Haiku es ~250× más barato y produce JSON estructurado directamente.

---

## Implementación del controller

```javascript
// backend/src/controllers/ocr.controller.js
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function processReceipt(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const mimeType = req.file.mimetype.startsWith('image/') ? req.file.mimetype : 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 }
          },
          {
            type: 'text',
            text: `Analiza este recibo y extrae la información en JSON con este formato exacto:
{
  "merchant": "nombre del comercio",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "currency": "USD",
  "line_items": [
    { "description": "producto", "amount": 0.00, "quantity": "1" }
  ]
}
Solo responde con el JSON, sin explicaciones adicionales.`
          }
        ]
      }]
    });

    const raw = message.content[0]?.text?.trim() || '{}';
    // Eliminar bloques markdown ```json ... ```
    const jsonMatch = raw.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/) || [null, raw];
    const parsed = JSON.parse(jsonMatch[1].trim());

    res.json(parsed);
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'Error procesando el recibo' });
  }
}
```

---

## Configuración Multer

```javascript
// Solo acepta imágenes y PDFs, máximo 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    cb(null, allowed);
  }
});
```

El archivo se mantiene en memoria (`memoryStorage`) y nunca se escribe al disco.

---

## Compresión en el frontend

Antes de enviar, el frontend comprime la imagen para reducir el uso de tokens:

- Redimensiona a máximo 1920px de ancho/alto manteniendo proporción
- Comprime a JPEG con calidad 82%
- Respeta la orientación EXIF (evita imágenes rotadas)

```javascript
// Ejemplo simplificado del proceso en el frontend
const canvas = document.createElement('canvas');
// ... redimensionar ...
canvas.toBlob(blob => {
  const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
  // Enviar al backend
}, 'image/jpeg', 0.82);
```

---

## Variable de entorno requerida

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Sin esta clave el endpoint responde `500`. Se obtiene en [console.anthropic.com](https://console.anthropic.com).

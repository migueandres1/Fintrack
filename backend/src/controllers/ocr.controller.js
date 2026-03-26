import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// Inicializa el cliente — usa GOOGLE_APPLICATION_CREDENTIALS del entorno
// o la clave inline en GOOGLE_CREDENTIALS_JSON
function getClient() {
  const inlineJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (inlineJson) {
    const credentials = JSON.parse(inlineJson);
    return new DocumentProcessorServiceClient({ credentials });
  }
  // Si existe el archivo señalado por GOOGLE_APPLICATION_CREDENTIALS se usa automáticamente
  return new DocumentProcessorServiceClient();
}

// Extrae el valor de texto de una entidad, manejando tanto texto plano como mentionText
function entityText(entity) {
  return entity?.mentionText ?? entity?.normalizedValue?.text ?? '';
}

// Convierte "DD/MM/YYYY" o "YYYY-MM-DD" o "Month DD, YYYY" a "YYYY-MM-DD"
function normalizeDate(raw) {
  if (!raw) return null;
  // Ya está en formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
  // Intento genérico
  const d = new Date(raw);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return null;
}

// Extrae número de un string monetario, soportando ambos separadores decimales:
//   "$1,234.56"  → 1234.56  (punto decimal)
//   "Q 1.234,56" → 1234.56  (coma decimal, punto miles)
//   "1250,00"    → 1250.00  (coma decimal sin miles)
//   "1250.00"    → 1250.00  (punto decimal sin miles)
function parseAmount(raw) {
  if (!raw) return null;
  // Quitar símbolos de moneda y espacios, conservar dígitos, puntos, comas y signo
  let s = raw.replace(/[^\d.,\-]/g, '').trim();
  if (!s) return null;

  const lastDot   = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  if (lastDot > lastComma) {
    // Punto es decimal: "1,234.56" → eliminar comas
    s = s.replace(/,/g, '');
  } else if (lastComma > lastDot) {
    // Coma es decimal: "1.234,56" o "1250,56" → eliminar puntos, coma→punto
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Solo un tipo de separador o ninguno: tratar coma como miles
    s = s.replace(/,/g, '');
  }

  const num = parseFloat(s);
  return isNaN(num) ? null : +Math.abs(num).toFixed(2);
}

export async function processReceipt(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  const projectId   = process.env.GOOGLE_PROJECT_ID;
  const location    = process.env.GOOGLE_LOCATION || 'us';
  const processorId = process.env.GOOGLE_PROCESSOR_ID;

  if (!projectId || !processorId) {
    return res.status(503).json({
      error: 'OCR no configurado. Agrega GOOGLE_PROJECT_ID y GOOGLE_PROCESSOR_ID en el .env',
    });
  }

  const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  try {
    const client = getClient();

    const mimeType = req.file.mimetype || 'image/jpeg';
    const content  = req.file.buffer.toString('base64');

    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: { content, mimeType },
    });

    const entities = result.document?.entities ?? [];

    // Mapear entidades del Expense Parser
    const getValue = (type) => {
      const e = entities.find(e => e.type === type);
      return e ? entityText(e) : null;
    };

    // Algunos procesadores usan snake_case, otros camelCase
    const supplierName =
      getValue('supplier_name') ||
      getValue('receiver_name') ||
      getValue('vendor_name') ||
      null;

    const totalRaw =
      getValue('total_amount') ||
      getValue('net_amount') ||
      getValue('amount_paid') ||
      null;

    const dateRaw =
      getValue('receipt_date') ||
      getValue('invoice_date') ||
      getValue('purchase_date') ||
      null;

    const currency =
      getValue('currency') ||
      getValue('currency_code') ||
      null;

    // Líneas de detalle (tipo line_item/* son entidades hijo)
    const lineItems = entities
      .filter(e => e.type === 'line_item')
      .map(li => {
        const props = {};
        (li.properties ?? []).forEach(p => {
          props[p.type] = entityText(p);
        });
        return {
          description: props['line_item/description'] || props['description'] || '',
          amount:      parseAmount(props['line_item/amount'] || props['amount'] || ''),
          quantity:    props['line_item/quantity'] || '',
        };
      })
      .filter(li => li.description || li.amount);

    const extracted = {
      merchant:   supplierName,
      amount:     parseAmount(totalRaw),
      date:       normalizeDate(dateRaw),
      currency:   currency,
      line_items: lineItems,
      raw_text:   result.document?.text?.slice(0, 500) || null,
    };

    res.json(extracted);
  } catch (err) {
    console.error('Document AI error:', err.message);
    res.status(500).json({ error: 'Error al procesar el recibo: ' + err.message });
  }
}

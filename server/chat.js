import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db, getSettings, HttpError } from './db.js';

const r = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Estás escribiendo muy rápido. Espera unos segundos.' } });

export const aiEnabled = () => !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);

const SYSTEM = (user) => {
  const s = getSettings();
  const k = db.prepare("SELECT (SELECT COUNT(*) FROM customers) AS c, (SELECT COUNT(*) FROM products) AS p, (SELECT COUNT(*) FROM products WHERE stock <= min_stock) AS low").get();
  return `Eres el asistente del CRM de ${s.company_name}. Hablas español, tono cercano y breve (máximo 5 frases).
Ayudas a ${user.name} (rol: ${user.role === 'admin' ? 'administrador' : 'empleado'}) a usar el sistema: clientes, productos, proveedores, ventas${user.role === 'admin' ? ', empleados y configuración' : ''}.
Datos del sistema: ${k.c} clientes, ${k.p} productos, ${k.low} con stock bajo, IVA ${Math.round(s.tax_rate * 100)}%, valores en pesos colombianos (COP).
No inventes cifras que no estén aquí. Si te preguntan algo ajeno al CRM, responde brevemente y vuelve al tema.`;
};

async function openai(system, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, max_tokens: 400, messages: [{ role: 'system', content: system }, ...messages] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content?.trim();
}
async function gemini(system, messages) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  return (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
}

r.get('/status', (_req, res) => res.json({ ai: aiEnabled() }));

r.post('/', limiter, async (req, res) => {
  if (!aiEnabled()) return res.status(501).json({ fallback: true, error: 'La IA no está configurada.' });
  const msgs = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw new HttpError(422, 'Escribe un mensaje.');
  try {
    const system = SYSTEM(req.user);
    const reply = process.env.OPENAI_API_KEY ? await openai(system, msgs) : await gemini(system, msgs);
    if (!reply) throw new Error('vacío');
    res.json({ reply });
  } catch (e) {
    console.warn('[chat]', e.message);
    res.status(502).json({ fallback: true, error: 'No pude consultar la IA en este momento.' });
  }
});

export default r;

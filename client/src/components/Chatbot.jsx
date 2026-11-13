import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { reply, SUGGESTIONS } from '../chatbot.js';

export default function Chatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: `Hola, soy el asistente del CRM. Pregúntame cómo hacer algo o por tus cifras del día.` }]);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const end = useRef(null); const input = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy, open]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50); }, [open]);

  async function send(raw) {
    const content = (raw ?? text).trim(); if (!content || busy) return;
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const r = await reply(next.filter((m, i) => i > 0 || m.role === 'user'), user);
      setMsgs((m) => [...m, { role: 'assistant', content: r.text, link: r.link }]);
    } catch { setMsgs((m) => [...m, { role: 'assistant', content: 'No pude responder en este momento. Inténtalo de nuevo.' }]); }
    finally { setBusy(false); }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-40 flex h-[min(560px,calc(100vh-8rem))] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-line bg-ink-800 shadow-pop" role="dialog" aria-label="Asistente del CRM">
          <div className="flex items-center justify-between border-b border-line bg-ink-700 px-4 py-3">
            <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-ink-950"><Bot className="h-4 w-4" /></span><div><p className="text-sm font-bold leading-tight">Asistente</p><p className="text-xs text-mute">Ayuda y cifras rápidas</p></div></div>
            <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-md bg-brand text-ink-950' : 'rounded-bl-md bg-ink-600 text-slate-100'}`}>
                  {m.content}
                  {m.link && <Link to={m.link[0]} onClick={() => setOpen(false)} className="mt-2 block text-xs font-bold text-brand-300 underline">{m.link[1]}</Link>}
                </div>
              </div>))}
            {busy && <div className="flex"><div className="rounded-2xl rounded-bl-md bg-ink-600 px-3.5 py-2.5"><Loader2 className="h-4 w-4 animate-spin text-mute" /></div></div>}
            {msgs.length === 1 && <div className="flex flex-wrap gap-2 pt-1">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs text-slate-300 transition hover:border-brand hover:text-white">{s}</button>)}</div>}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input ref={input} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" maxLength={300} aria-label="Mensaje" />
            <button className="btn-primary !px-3.5" disabled={busy || !text.trim()} aria-label="Enviar"><Send className="h-4 w-4" /></button>
          </form>
        </div>)}
      <button onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} aria-expanded={open}
        className="fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-ink-950 shadow-pop transition hover:scale-105 hover:bg-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 print:hidden">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

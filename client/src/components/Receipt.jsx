import { Printer, Download } from 'lucide-react';
import { money, dateTime, pct } from '../format.js';
import { Modal } from '../ui.jsx';

function receiptHtml(s) {
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = s.items.map((i) => `<tr><td>${esc(i.name)}<br><small>${esc(i.sku)}</small></td><td class="r">${i.qty}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.line_total)}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Recibo de venta #${s.id}</title>
<style>body{font:14px system-ui,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;color:#111}h1{margin:0;font-size:20px}small{color:#666}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:8px 4px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}.tot td{border:0;padding:3px 4px}.big td{font-size:17px;font-weight:700;border-top:2px solid #111}</style>
<h1>${esc(s.company.company_name)}</h1><small>NIT ${esc(s.company.tax_id)} · ${esc(s.company.address)}</small>
<p><b>Recibo de venta #${s.id}</b>${s.status === 'cancelled' ? ' — ANULADA' : ''}<br>${esc(dateTime(s.created_at))}<br>Cliente: ${esc(s.customer_name)} ${s.customer_tax_id ? '(' + esc(s.customer_tax_id) + ')' : ''}<br>Atendió: ${esc(s.employee_name || '—')}</p>
<table><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Total</th></tr>${rows}
<tr class="tot"><td colspan="3" class="r">Subtotal</td><td class="r">${money(s.subtotal)}</td></tr>
<tr class="tot"><td colspan="3" class="r">IVA (${pct(s.tax_rate)})</td><td class="r">${money(s.tax)}</td></tr>
<tr class="big"><td colspan="3" class="r">Total</td><td class="r">${money(s.total)}</td></tr></table>
<p><small>Valores en pesos colombianos (COP). Gracias por tu compra.</small></p></html>`;
}

export default function Receipt({ sale, onClose }) {
  if (!sale) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob([receiptHtml(sale)], { type: 'text/html' }));
    const a = document.createElement('a'); a.href = url; a.download = `recibo-${sale.id}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Modal open onClose={onClose} title={`Venta #${sale.id}`}
      footer={<><button className="btn-ghost" onClick={download}><Download className="h-4 w-4" />Descargar</button><button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</button></>}>
      <div id="receipt" className="rounded-xl bg-white p-6 text-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div><p className="text-lg font-extrabold">{sale.company.company_name}</p><p className="text-xs text-slate-500">NIT {sale.company.tax_id} · {sale.company.address}</p></div>
          <div className="text-right"><p className="text-sm font-bold">Recibo #{sale.id}</p><p className="text-xs text-slate-500">{dateTime(sale.created_at)}</p>
            {sale.status === 'cancelled' && <p className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">ANULADA</p>}</div>
        </div>
        <p className="mt-4 text-sm"><span className="text-slate-500">Cliente:</span> <b>{sale.customer_name}</b>{sale.customer_tax_id && ` · ${sale.customer_tax_id}`}<br /><span className="text-slate-500">Atendió:</span> {sale.employee_name || '—'}</p>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="border-b border-slate-300 text-left text-xs text-slate-500"><th className="py-2">Producto</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">Precio</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody>{sale.items.map((i) => (
            <tr key={i.id} className="border-b border-slate-100"><td className="py-2">{i.name}<br /><span className="font-mono text-xs text-slate-400">{i.sku}</span></td><td className="py-2 text-right">{i.qty}</td><td className="py-2 text-right">{money(i.unit_price)}</td><td className="py-2 text-right">{money(i.line_total)}</td></tr>))}</tbody>
        </table>
        <dl className="ml-auto mt-4 w-full max-w-[260px] space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">IVA ({pct(sale.tax_rate)})</dt><dd>{money(sale.tax)}</dd></div>
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-extrabold"><dt>Total</dt><dd>{money(sale.total)}</dd></div>
        </dl>
        <p className="mt-6 text-center text-xs text-slate-400">Valores en pesos colombianos (COP)</p>
      </div>
    </Modal>
  );
}

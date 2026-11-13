import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Modal, Confirm, Field, Empty, PageHeader, SearchBox, Pagination, Spinner, useList, useDebounced, useToast } from '../ui.jsx';

/**
 * Página CRUD genérica, dirigida por configuración.
 * cfg: { title, subtitle, singular, endpoint, columns, fields, filters, searchPlaceholder,
 *        blank, toForm(row), emptyText, canEdit(user,row), canDelete(user,row), deleteText(row), rowActions }
 */
export default function CrudPage({ cfg }) {
  const { user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState({});
  const dq = useDebounced(q);
  const list = useList(cfg.endpoint, { q: dq, ...flt });
  const [editing, setEditing] = useState(null);     // null | 'new' | row
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null);

  const open = (row) => { setErrors({}); setForm(row ? (cfg.toForm ? cfg.toForm(row) : { ...row }) : { ...cfg.blank }); setEditing(row || 'new'); };
  const set = (name, v) => { setForm((f) => ({ ...f, [name]: v })); setErrors((e) => ({ ...e, [name]: undefined })); };

  async function save(e) {
    e.preventDefault(); setSaving(true); setErrors({});
    try {
      const body = cfg.toBody ? cfg.toBody(form, editing === 'new') : form;
      if (editing === 'new') await api.post(cfg.endpoint, body); else await api.put(`${cfg.endpoint}/${editing.id}`, body);
      toast.ok(editing === 'new' ? `${cfg.singular} creado.` : `${cfg.singular} actualizado.`);
      setEditing(null); list.reload(); cfg.onChange?.();
    } catch (err) {
      setErrors(err.fields || {});
      if (!Object.keys(err.fields || {}).length) toast.error(err.message);
    } finally { setSaving(false); }
  }
  async function remove() {
    setDeleting(true);
    try { await api.del(`${cfg.endpoint}/${toDelete.id}`); toast.ok(`${cfg.singular} eliminado.`); setToDelete(null); if (list.data.length === 1 && list.page > 1) list.setPage(list.page - 1); else list.reload(); }
    catch (err) { toast.error(err.message); setToDelete(null); }
    finally { setDeleting(false); }
  }

  const fields = typeof cfg.fields === 'function' ? cfg.fields(editing === 'new') : cfg.fields;
  const filters = typeof cfg.filters === 'function' ? cfg.filters() : cfg.filters || [];
  const canEdit = (r) => (cfg.canEdit ? cfg.canEdit(user, r) : true);
  const canDelete = (r) => (cfg.canDelete ? cfg.canDelete(user, r) : true);

  return (
    <>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}
        actions={<button className="btn-primary" onClick={() => open(null)}><Plus className="h-4 w-4" />Nuevo {cfg.singular.toLowerCase()}</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <SearchBox value={q} onChange={setQ} placeholder={cfg.searchPlaceholder} />
          {filters.map((f) => (
            <select key={f.name} className="input w-auto min-w-[160px]" value={flt[f.name] || ''} onChange={(e) => setFlt((s) => ({ ...s, [f.name]: e.target.value }))} aria-label={f.label}>
              <option value="">{f.label}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
        {list.error ? <Empty title="No pudimos cargar la lista" text={list.error} action={<button className="btn-ghost" onClick={list.reload}>Reintentar</button>} />
          : list.loading && !list.data.length ? <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
          : !list.data.length ? <Empty title={q || Object.values(flt).some(Boolean) ? 'Sin resultados' : `Aún no hay ${cfg.plural}`} text={q || Object.values(flt).some(Boolean) ? 'Prueba con otra búsqueda o quita los filtros.' : cfg.emptyText}
              action={!q && <button className="btn-primary" onClick={() => open(null)}><Plus className="h-4 w-4" />Crear {cfg.singular.toLowerCase()}</button>} />
          : (
            <div className={`overflow-x-auto transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-line bg-ink-900/40"><tr>
                  {cfg.columns.map((c) => <th key={c.key} className={`th ${c.className || ''}`}>{c.label}</th>)}
                  <th className="th w-px text-right">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {list.data.map((row) => (
                    <tr key={row.id} className="hover:bg-ink-700/40">
                      {cfg.columns.map((c) => <td key={c.key} className={`td ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key] || <span className="text-mute">—</span>}</td>)}
                      <td className="td"><div className="flex justify-end gap-1">
                        {cfg.detail && <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDetail(row)}>Ver</button>}
                        {canEdit(row) && <button className="btn-icon" onClick={() => open(row)} aria-label={`Editar ${cfg.singular.toLowerCase()}`}><Pencil className="h-4 w-4" /></button>}
                        {canDelete(row) && <button className="btn-icon hover:!text-danger" onClick={() => setToDelete(row)} aria-label={`Eliminar ${cfg.singular.toLowerCase()}`}><Trash2 className="h-4 w-4" /></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pagination {...list} onPage={list.setPage} />
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing === 'new' ? `Nuevo ${cfg.singular.toLowerCase()}` : `Editar ${cfg.singular.toLowerCase()}`} wide={fields.length > 6}
        footer={<><button type="button" className="btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
          <button form="crud-form" className="btn-primary" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button></>}>
        <form id="crud-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
          {fields.map((f) => (
            <Field key={f.name} label={f.label + (f.required ? ' *' : '')} error={errors[f.name]} hint={f.hint} className={f.full ? 'sm:col-span-2' : ''}>
              {f.type === 'select' ? (
                <select className={`input ${errors[f.name] ? 'err' : ''}`} value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                  {f.optional && <option value="">{f.optional}</option>}
                  {(typeof f.options === 'function' ? f.options() : f.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={3} className={`input ${errors[f.name] ? 'err' : ''}`} value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
              ) : (
                <input className={`input ${errors[f.name] ? 'err' : ''}`} type={f.type || 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined} min={f.min} autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                  value={form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
              )}
            </Field>
          ))}
        </form>
      </Modal>

      <Confirm open={!!toDelete} danger busy={deleting} title={`Eliminar ${cfg.singular.toLowerCase()}`} confirmLabel="Eliminar"
        text={toDelete ? (cfg.deleteText ? cfg.deleteText(toDelete) : `Vas a eliminar a “${toDelete[cfg.nameKey || 'name']}”. Esta acción no se puede deshacer.`) : ''}
        onConfirm={remove} onClose={() => setToDelete(null)} />
      {cfg.detail && <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail[cfg.nameKey || 'name'] : ''} wide>{detail && cfg.detail(detail)}</Modal>}
    </>
  );
}

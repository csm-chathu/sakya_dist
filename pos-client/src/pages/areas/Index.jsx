import { useState } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  useGetAreasQuery,
  useCreateAreaMutation,
  useUpdateAreaMutation,
  useDeleteAreaMutation,
} from '../../features/areas/areasApi';

const inputCls = 'border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-full';

function AreaModal({ initial, onSave, onClose, loading }) {
  const { t } = useLocale();
  const [form, setForm] = useState(initial || { name: '', description: '' });

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          {initial ? 'Edit Area' : 'New Area'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea
              className={inputCls + ' resize-none'}
              rows={3}
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AreasIndex() {
  const { t } = useLocale();
  const { data, isLoading } = useGetAreasQuery();
  const [createArea, { isLoading: creating }] = useCreateAreaMutation();
  const [updateArea, { isLoading: updating }] = useUpdateAreaMutation();
  const [deleteArea] = useDeleteAreaMutation();

  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', area?: obj }
  const [error, setError] = useState('');

  const areas = data?.data || [];

  async function handleSave(form) {
    setError('');
    try {
      if (modal.mode === 'create') {
        await createArea(form).unwrap();
      } else {
        await updateArea({ id: modal.area.id, ...form }).unwrap();
      }
      setModal(null);
    } catch (e) {
      setError(e?.data?.error || 'Failed to save');
    }
  }

  async function handleDelete(area) {
    if (!confirm(`Delete area "${area.name}"?`)) return;
    try {
      await deleteArea(area.id).unwrap();
    } catch (e) {
      alert(e?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Areas</h1>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + New Area
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : areas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No areas yet. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas.map((area, i) => (
                <tr key={area.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{area.name}</td>
                  <td className="px-4 py-3 text-slate-500">{area.description || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ mode: 'edit', area })}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(area)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <AreaModal
          initial={modal.mode === 'edit' ? { name: modal.area.name, description: modal.area.description } : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
          loading={creating || updating}
        />
      )}
    </div>
  );
}

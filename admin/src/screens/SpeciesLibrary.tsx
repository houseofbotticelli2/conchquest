import { useEffect, useMemo, useState } from 'react';
import { listSpecies, createSpecies, updateSpecies, deleteSpecies, type Species, type Rarity, type SpeciesInput } from '../lib/api';

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'very_rare'];

function rarityPillClass(rarity: Rarity): string {
  if (rarity === 'common') return 'pill pill-good';
  if (rarity === 'uncommon') return 'pill pill-warn';
  return 'pill pill-critical';
}

function rarityLabel(rarity: Rarity): string {
  return rarity === 'very_rare' ? 'Very rare' : rarity[0]!.toUpperCase() + rarity.slice(1);
}

const EMPTY_FORM: SpeciesInput = {
  commonName: '',
  scientificName: '',
  family: '',
  genus: '',
  rarity: 'common',
  description: '',
  habitat: '',
  seasonality: '',
};

export function SpeciesLibrary() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpeciesInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Species | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setLoading(true);
    setError(null);
    listSpecies()
      .then(setSpecies)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load species'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return species.filter((s) => {
      if (rarityFilter && s.rarity !== rarityFilter) return false;
      if (!query) return true;
      return s.commonName.toLowerCase().includes(query) || s.scientificName.toLowerCase().includes(query);
    });
  }, [species, search, rarityFilter]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(s: Species) {
    setEditingId(s.id);
    setForm({
      commonName: s.commonName,
      scientificName: s.scientificName,
      family: s.family ?? '',
      genus: s.genus ?? '',
      rarity: s.rarity,
      description: s.description ?? '',
      habitat: s.habitat ?? '',
      seasonality: s.seasonality ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.commonName.trim() || !form.scientificName.trim()) {
      setFormError('Common name and scientific name are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateSpecies(editingId, form);
      } else {
        await createSpecies(form);
      }
      setFormOpen(false);
      refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save species');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSpecies(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete species');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Species Library</h1>
          <div className="desc">The shell catalog shown in the mobile app's Library tab. Edits here take effect without a migration.</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add species
        </button>
      </div>

      {error && <div className="error-note">{error}</div>}

      {formOpen && (
        <div className="panel">
          <div className="panel-head">
            <h2>{editingId ? 'Edit species' : 'New species'}</h2>
          </div>
          <div className="panel-body">
            <div className="two-col">
              <div>
                <div className="field">
                  <label className="form-label">Common name</label>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    value={form.commonName}
                    onChange={(e) => setForm({ ...form, commonName: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="form-label">Scientific name</label>
                  <input
                    className="search-input"
                    style={{ width: '100%', fontStyle: 'italic' }}
                    value={form.scientificName}
                    onChange={(e) => setForm({ ...form, scientificName: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="form-label">Rarity</label>
                  <select className="form-select" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as Rarity })}>
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>
                        {rarityLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="form-label">Family / Genus</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="search-input"
                      placeholder="Family"
                      value={form.family ?? ''}
                      onChange={(e) => setForm({ ...form, family: e.target.value })}
                    />
                    <input
                      className="search-input"
                      placeholder="Genus"
                      value={form.genus ?? ''}
                      onChange={(e) => setForm({ ...form, genus: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <div className="field">
                  <label className="form-label">Habitat</label>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    value={form.habitat ?? ''}
                    onChange={(e) => setForm({ ...form, habitat: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="form-label">Seasonality</label>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    value={form.seasonality ?? ''}
                    onChange={(e) => setForm({ ...form, seasonality: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={form.description ?? ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
            {formError && <div className="modal-error">{formError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save species'}
              </button>
              <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="search-row">
          <input className="search-input" type="text" placeholder="Search by common or scientific name..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className={`btn btn-sm ${rarityFilter === null ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRarityFilter(null)}>
            All
          </button>
          {RARITIES.map((r) => (
            <button key={r} className={`btn btn-sm ${rarityFilter === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRarityFilter(r)}>
              {rarityLabel(r)}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="empty-note">No species match.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Common name</th>
                  <th>Scientific name</th>
                  <th>Rarity</th>
                  <th>Family</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td className="name">{s.commonName}</td>
                    <td className="mono" style={{ fontStyle: 'italic' }}>
                      {s.scientificName}
                    </td>
                    <td>
                      <span className={rarityPillClass(s.rarity)}>{rarityLabel(s.rarity)}</span>
                    </td>
                    <td>{s.family || '—'}</td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(s)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="scrim" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h3>Delete {deleteTarget.commonName}?</h3>
            </div>
            <div className="modal-body">
              <div className="modal-warn">
                Any existing finds logged with this species keep their record, just without a species attached. This can't be undone.
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete species'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

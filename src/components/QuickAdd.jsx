import React, { useState } from "react";
import { usePeople } from "../hooks/usePeople";
import { quickAddToMany } from "../hooks/giftActions";

export default function QuickAdd({ currentUid, onClose }) {
  const { people } = usePeople();
  const [selected, setSelected] = useState(new Set());
  const [title, setTitle] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function toggle(id) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function save() {
    if (!title.trim() || selected.size === 0) return;
    setSaving(true);
    await quickAddToMany({
      personIds: Array.from(selected),
      title: title.trim(),
      addedByUid: currentUid,
      photoFile,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(20,25,40,0.35)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--card-bg)", width: "100%", maxWidth: 760,
        borderRadius: "14px 14px 0 0", padding: "22px 24px 28px",
      }}>
        <h4 style={{ fontFamily: "'Caveat', cursive", fontSize: 26, margin: "0 0 14px" }}>
          Quick add a gift idea
        </h4>

        <label className="mono">Who's it for? (tick as many as you like)</label>
        <input
          type="text" placeholder="search names…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 6, marginBottom: 8 }}
        />
        <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--paper-edge)", borderRadius: 5 }}>
          {filtered.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: 8, padding: "8px 10px", alignItems: "center" }}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              {p.name}
            </label>
          ))}
        </div>

        <label className="mono" style={{ display: "block", marginTop: 12 }}>What's the idea?</label>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. that board game everyone was talking about"
          style={{ width: "100%", padding: 9 }}
        />

        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} style={{ marginTop: 12 }} />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--ink-soft)" }}>Cancel</button>
          <button
            onClick={save} disabled={saving}
            style={{ flex: 1, background: "var(--you)", color: "#fff", border: "none", padding: 11, borderRadius: 6 }}
          >
            {saving ? "Saving…" : `Save idea${selected.size > 1 ? ` for ${selected.size} people` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

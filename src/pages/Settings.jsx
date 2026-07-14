import React from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { usePeople } from "../hooks/usePeople";

export default function Settings({ onBack }) {
  const { people } = usePeople({ includeArchived: true });

  async function toggleArchived(person) {
    const verb = person.archived ? "restore" : "archive";
    const ok = window.confirm(
      person.archived
        ? `Bring "${person.name}" back into the active list?`
        : `Archive "${person.name}"? (e.g. a death or breakup - they'll disappear from Home but nothing is deleted)`
    );
    if (!ok) return;
    await updateDoc(doc(db, "people", person.id), { archived: !person.archived });
  }

  const active = people.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
  const archived = people.filter((p) => p.archived).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <button onClick={onBack} className="mono" style={{ background: "none", border: "none", cursor: "pointer" }}>
        &larr; back
      </button>
      <h1 className="name">Settings</h1>

      <h3 className="section-label" style={{ marginTop: 20 }}>Archive someone</h3>
      <p className="mono">Archived people drop off Home but their history stays intact.</p>
      {active.map((p) => (
        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 2px", borderBottom: "1px solid var(--paper-edge)" }}>
          <span>{p.name}</span>
          <button className="mono" onClick={() => toggleArchived(p)}>archive</button>
        </div>
      ))}

      {archived.length > 0 && (
        <>
          <h3 className="section-label" style={{ marginTop: 22 }}>Archived</h3>
          {archived.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 2px", borderBottom: "1px solid var(--paper-edge)" }}>
              <span style={{ color: "var(--ink-soft)" }}>{p.name}</span>
              <button className="mono" onClick={() => toggleArchived(p)}>restore</button>
            </div>
          ))}
        </>
      )}

      <h3 className="section-label" style={{ marginTop: 26 }}>Coming soon</h3>
      <div className="settings-placeholder">
        <strong>Who appears on your page</strong>
        <p className="mono">Checklist of who shows up when you're signed in as you.</p>
      </div>
      <div className="settings-placeholder">
        <strong>Card / present / Christmas checklists</strong>
        <p className="mono">Yearly prompts so nobody gets missed.</p>
      </div>
      <div className="settings-placeholder">
        <strong>Colour coding</strong>
        <p className="mono">Pick your colour vs your partner's, used across gift ideas and the "you"/"partner" dots.</p>
      </div>
    </div>
  );
}

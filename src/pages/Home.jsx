import React from "react";
import { usePeople, birthdaysThisMonth } from "../hooks/usePeople";

export default function Home({ onOpenPerson, onOpenQuickAdd }) {
  const { people, loading } = usePeople();
  const soon = birthdaysThisMonth(people);

  return (
    <div className="page">
      <span className="mono" style={{
        display: "inline-block", background: "var(--ink)", color: "#fff",
        padding: "4px 16px 6px", borderRadius: "0 0 6px 6px", marginBottom: 18,
      }}>Noted</span>

      <h3 className="section-label">This month</h3>
      {soon.length === 0 && <p className="mono">Nothing coming up in the next few weeks.</p>}
      {soon.map((p) => (
        <div key={p.id} onClick={() => onOpenPerson(p.id)} style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          padding: "12px 4px", borderBottom: "1px dashed var(--paper-edge)", cursor: "pointer",
        }}>
          <span style={{ fontWeight: 600 }}>{p.name}</span>
          <span className="mono" style={{ color: p.daysAway <= 7 ? "var(--soon)" : "var(--later)", fontWeight: 700 }}>
            {p.daysAway === 0 ? "today" : `in ${p.daysAway} days`}
          </span>
        </div>
      ))}

      <h3 className="section-label" style={{ marginTop: 28 }}>Everyone</h3>
      {loading && <p className="mono">Loading…</p>}
      {people.map((p) => (
        <div key={p.id} onClick={() => onOpenPerson(p.id)} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "13px 4px", borderBottom: "1px solid var(--paper-edge)", cursor: "pointer",
        }}>
          <span>{p.name}</span>
          <span className="mono" style={{ color: "var(--ink-soft)" }}>&rsaquo;</span>
        </div>
      ))}

      <button className="fab" onClick={onOpenQuickAdd}>+</button>
    </div>
  );
}

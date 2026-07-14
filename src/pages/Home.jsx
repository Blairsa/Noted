import React, { useMemo, useRef, useState } from "react";
import { usePeople, birthdaysThisMonth } from "../hooks/usePeople";
import { formatAgeAndDob } from "../utils/date";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Home({ onOpenPerson, onOpenQuickAdd, onOpenSettings }) {
  const { people, loading } = usePeople();
  const soon = birthdaysThisMonth(people);
  const [search, setSearch] = useState("");
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter((p) => p.name.toLowerCase().includes(term));
  }, [people, search]);

  // Which letters actually have someone in the (unfiltered) list - so we can
  // grey out ones with nobody in them rather than showing a dead tab.
  const lettersWithPeople = useMemo(() => {
    const set = new Set();
    people.forEach((p) => {
      const letter = p.name.trim()[0]?.toUpperCase();
      if (letter) set.add(letter);
    });
    return set;
  }, [people]);

  function jumpToLetter(letter) {
    const el = listRef.current?.querySelector(`[data-letter="${letter}"]`);
    if (el) el.scrollIntoView({ block: "start" });
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="mono" style={{
          display: "inline-block", background: "var(--ink)", color: "#fff",
          padding: "4px 16px 6px", borderRadius: "0 0 6px 6px", marginBottom: 18,
        }}>Noted</span>
        <button
          onClick={onOpenSettings}
          className="mono"
          title="Settings"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-soft)" }}
        >
          ⚙︎
        </button>
      </div>

      <input
        type="text"
        placeholder="Search names…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      <h3 className="section-label" style={{ marginTop: 18 }}>This month</h3>
      {soon.length === 0 && <p className="mono">Nothing coming up in the next few weeks.</p>}
      {soon.length > 0 && (
        <div className="birthday-strip">
          {soon.map((p) => (
            <div
              key={p.id}
              className="birthday-card"
              onClick={() => onOpenPerson(p.id)}
              style={p.pinned ? { borderColor: "var(--you)" } : undefined}
            >
              {p.pinned && <div className="birthday-card-pin mono">pinned</div>}
              <div className="birthday-card-name">{p.name}</div>
              <div className="mono" style={{ color: "var(--ink-soft)", marginTop: 2 }}>
                {formatAgeAndDob(p.birthdate)}
              </div>
              <div className="mono" style={{
                marginTop: 6, fontWeight: 700,
                color: p.pinned ? "var(--you)" : p.daysAway <= 7 ? "var(--soon)" : "var(--later)",
              }}>
                {p.pinned ? "always here" : p.daysAway === 0 ? "today" : `in ${p.daysAway} days`}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="section-label" style={{ marginTop: 28 }}>Everyone</h3>
      {loading && <p className="mono">Loading…</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <div className="alpha-index mono">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => jumpToLetter(letter)}
              disabled={!lettersWithPeople.has(letter)}
              className="alpha-index-btn"
            >
              {letter}
            </button>
          ))}
        </div>

        <div ref={listRef} style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 && !loading && (
            <p className="mono">No one matches "{search}".</p>
          )}
          {filtered.map((p, i) => {
            const letter = p.name.trim()[0]?.toUpperCase();
            const isFirstOfLetter = filtered[i - 1]?.name.trim()[0]?.toUpperCase() !== letter;
            return (
              <div
                key={p.id}
                data-letter={isFirstOfLetter ? letter : undefined}
                onClick={() => onOpenPerson(p.id)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "13px 4px", borderBottom: "1px solid var(--paper-edge)", cursor: "pointer",
                }}
              >
                <span>{p.name}</span>
                <span className="mono" style={{ color: "var(--ink-soft)" }}>&rsaquo;</span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="fab" onClick={onOpenQuickAdd}>+</button>
    </div>
  );
}

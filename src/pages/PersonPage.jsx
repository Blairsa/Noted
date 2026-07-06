import React, { useState } from "react";
import { usePerson } from "../hooks/usePerson";
import { markGiftBought, deleteGiftIdea } from "../hooks/giftActions";

export default function PersonPage({ personId, currentUid, myLinkedPersonId, myColour, onBack }) {
  const { person, giftIdeas, pastGifts, events, isOwnPerson } = usePerson(personId, currentUid, myLinkedPersonId);
  const [tab, setTab] = useState(null); // null = landing view (likes/dislikes/ideas)

  if (!person) return <div className="page"><button onClick={onBack}>&larr; back</button><p>Loading…</p></div>;

  async function handleBought(idea) {
    const note = window.prompt(
      "Nice one — what did you get, so you remember next year once the photo's gone?",
      idea.title
    );
    if (note === null) return; // cancelled
    await markGiftBought({
      personId, ideaId: idea.id, addedByUid: currentUid,
      note: note.trim() || idea.title, year: new Date().getFullYear(),
    });
  }

  async function handleDelete(idea) {
    if (window.confirm(`Delete "${idea.title}"?`)) {
      await deleteGiftIdea({ personId, ideaId: idea.id, photoPath: idea.photoPath });
    }
  }

  return (
    <div className="page">
      <button onClick={onBack} className="mono" style={{ background: "none", border: "none", cursor: "pointer" }}>
        &larr; back to everyone
      </button>

      <h1 className="name">{person.name}</h1>
      <div className="subline">{person.birthdate}</div>
      {isOwnPerson && (
        <p className="mono" style={{ color: "var(--soon)" }}>
          This is you — you're only seeing gift ideas you added yourself.
        </p>
      )}

      <div style={{ display: "flex", gap: 18, marginTop: 16, marginBottom: 12, borderBottom: "1px solid var(--paper-edge)", paddingBottom: 10 }}>
        {["info", "events", "past", "qa"].map((t) => (
          <button
            key={t} onClick={() => setTab(tab === t ? null : t)}
            style={{
              background: "none", border: "none", fontWeight: 600, textTransform: "capitalize",
              color: tab === t ? "var(--ink)" : "var(--ink-soft)", cursor: "pointer",
              borderBottom: tab === t ? "3px solid var(--tab-info)" : "3px solid transparent", padding: "3px 2px 8px",
            }}
          >
            {t === "qa" ? "Q&A" : t === "past" ? "Past gifts" : t}
          </button>
        ))}
      </div>

      {tab === null && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
            <div className="note likes">
              <h2 className="note-title" style={{ color: "var(--you)" }}>Likes</h2>
              <ul>{(person.likes || []).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
            <div className="note dislikes">
              <h2 className="note-title" style={{ color: "var(--tab-qa)" }}>Dislikes</h2>
              <ul>{(person.dislikes || ["Nothing recorded yet"]).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          </div>

          <h3 style={{ fontWeight: 700 }}>Current gift ideas</h3>
          {giftIdeas.length === 0 && <p className="mono">No ideas yet.</p>}
          {giftIdeas.map((idea) => (
            <div key={idea.id} className="gift-card">
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 19, fontWeight: 700 }}>{idea.title}</div>
                <div className="mono" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span className="dot" style={{ background: idea.addedByUid === currentUid ? myColour : "var(--partner)" }} />
                  {idea.addedByUid === currentUid ? "you" : "partner"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => handleBought(idea)} title="Mark bought">✓</button>
                <button onClick={() => handleDelete(idea)} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "info" && (
        <div>
          <h3>Info</h3>
          <details>
            <summary className="mono" style={{ cursor: "pointer" }}>General Q&amp;A (tap to expand)</summary>
            <p className="mono">Shared questions live here — see QAPanel component for the full implementation.</p>
          </details>
        </div>
      )}

      {tab === "events" && (
        <div>
          <h3>Events</h3>
          {events.length === 0 && <p className="mono">No freeform events yet.</p>}
          {events.map((e) => <div key={e.id} style={{ padding: "8px 0" }}>{e.title}</div>)}
        </div>
      )}

      {tab === "past" && (
        <div>
          <h3>Past gifts</h3>
          {pastGifts.map((g) => (
            <div key={g.id} style={{ display: "flex", gap: 9, padding: "9px 3px", borderBottom: "1px dotted var(--paper-edge)" }}>
              <span className="mono" style={{ fontWeight: 700, color: "var(--tab-past)" }}>{g.year}</span>
              <span>{g.note}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "qa" && (
        <div>
          <h3>General Q&amp;A</h3>
          <p className="mono">Wire up questions/{"{questionId}"} + people/{personId}/answers here.</p>
        </div>
      )}
    </div>
  );
}

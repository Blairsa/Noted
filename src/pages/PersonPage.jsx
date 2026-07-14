import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { usePerson } from "../hooks/usePerson";
import { markGiftBought, deleteGiftIdea, addGiftIdea } from "../hooks/giftActions";
import { formatAgeAndDob } from "../utils/date";

export default function PersonPage({ personId, currentUid, myLinkedPersonId, myColour, onBack }) {
  const { person, giftIdeas, pastGifts, events, isOwnPerson } = usePerson(personId, currentUid, myLinkedPersonId);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaPhoto, setNewIdeaPhoto] = useState(null);
  const [addingIdea, setAddingIdea] = useState(false);

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

  async function handleAddIdea() {
    if (!newIdeaTitle.trim()) return;
    setAddingIdea(true);
    await addGiftIdea({
      personId, title: newIdeaTitle.trim(), addedByUid: currentUid, photoFile: newIdeaPhoto,
    });
    setNewIdeaTitle("");
    setNewIdeaPhoto(null);
    setAddingIdea(false);
  }

  // Click a like/dislike to edit or clear it. Writes the whole array back -
  // small enough lists that this is simpler and safer than arrayUnion/Remove
  // races between two people editing at once.
  async function editListItem(field, index) {
    const current = person[field] || [];
    const existing = current[index];
    const next = window.prompt(`Edit (clear the text to delete this one):`, existing);
    if (next === null) return; // cancelled
    const updated = [...current];
    if (next.trim() === "") {
      updated.splice(index, 1);
    } else {
      updated[index] = next.trim();
    }
    await updateDoc(doc(db, "people", personId), { [field]: updated });
  }

  return (
    <div className="page">
      <button onClick={onBack} className="mono" style={{ background: "none", border: "none", cursor: "pointer" }}>
        &larr; back to everyone
      </button>

      <h1 className="name">{person.name}</h1>
      <div className="subline">{formatAgeAndDob(person.birthdate)}</div>
      {isOwnPerson && (
        <p className="mono" style={{ color: "var(--soon)" }}>
          This is you — you're only seeing gift ideas you added yourself.
        </p>
      )}

      {(person.info || true) && (
        <details className="dropdown-section" style={{ marginTop: 16 }}>
          <summary className="mono" style={{ cursor: "pointer", fontWeight: 700 }}>Info</summary>
          <div style={{ marginTop: 10 }}>
            {person.info
              ? <p>{person.info}</p>
              : <p className="mono">Nothing recorded yet.</p>}

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dotted var(--paper-edge)" }}>
              <div className="mono" style={{ fontWeight: 700, marginBottom: 6 }}>Q&amp;A</div>
              <p className="mono">Wire up questions/{"{questionId}"} + people/{personId}/answers here.</p>
            </div>
          </div>
        </details>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 20, marginBottom: 22 }}>
        <div className="note likes">
          <h2 className="note-title" style={{ color: "var(--you)" }}>Likes</h2>
          <ul>
            {(person.likes || []).map((l, i) => (
              <li key={i}>
                <button className="tag-item" onClick={() => editListItem("likes", i)}>{l}</button>
              </li>
            ))}
            {(person.likes || []).length === 0 && <li className="mono" style={{ listStyle: "none" }}>Nothing recorded yet</li>}
          </ul>
        </div>
        <div className="note dislikes">
          <h2 className="note-title" style={{ color: "var(--tab-qa)" }}>Dislikes</h2>
          <ul>
            {(person.dislikes || []).map((l, i) => (
              <li key={i}>
                <button className="tag-item" onClick={() => editListItem("dislikes", i)}>{l}</button>
              </li>
            ))}
            {(person.dislikes || []).length === 0 && <li className="mono" style={{ listStyle: "none" }}>Nothing recorded yet</li>}
          </ul>
        </div>
      </div>

      <h3 style={{ fontWeight: 700 }}>Current gift ideas</h3>

      <div className="add-idea-row">
        <input
          type="text" value={newIdeaTitle} onChange={(e) => setNewIdeaTitle(e.target.value)}
          placeholder={`Add an idea for ${person.name}…`}
        />
        <input type="file" accept="image/*" onChange={(e) => setNewIdeaPhoto(e.target.files[0])} />
        <button onClick={handleAddIdea} disabled={addingIdea || !newIdeaTitle.trim()}>
          {addingIdea ? "Adding…" : "Add"}
        </button>
      </div>

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

      <h3 style={{ fontWeight: 700, marginTop: 26 }}>Past gifts</h3>
      {pastGifts.length === 0 && <p className="mono">Nothing bought yet.</p>}
      {pastGifts.map((g) => (
        <div key={g.id} style={{ display: "flex", gap: 9, padding: "9px 3px", borderBottom: "1px dotted var(--paper-edge)" }}>
          <span className="mono" style={{ fontWeight: 700, color: "var(--tab-past)" }}>{g.year}</span>
          <span>{g.note}</span>
        </div>
      ))}

      <details className="dropdown-section" style={{ marginTop: 26 }}>
        <summary className="mono" style={{ cursor: "pointer", fontWeight: 700 }}>Events</summary>
        <div style={{ marginTop: 10 }}>
          {events.length === 0 && <p className="mono">No freeform events yet.</p>}
          {events.map((e) => <div key={e.id} style={{ padding: "8px 0" }}>{e.title}</div>)}
        </div>
      </details>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useCouple } from "../hooks/useCouple";
import {
  addCoupleGiftIdea, markCoupleGiftBought, deleteCoupleGiftIdea, unlinkPartners,
} from "../hooks/giftActions";
import { formatDob } from "../utils/date";
import { anniversaryTheme, yearsMarried } from "../utils/anniversaryThemes";

function usePersonDoc(personId) {
  const [person, setPerson] = useState(null);
  useEffect(() => {
    if (!personId) return;
    return onSnapshot(doc(db, "people", personId), (snap) =>
      setPerson(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    );
  }, [personId]);
  return person;
}

export default function CouplePage({ coupleId, currentUid, myColour, onBack, onOpenPerson }) {
  const { couple, giftIdeas, pastGifts } = useCouple(coupleId);
  const personA = usePersonDoc(couple?.personIds?.[0]);
  const personB = usePersonDoc(couple?.personIds?.[1]);

  const [ideaName, setIdeaName] = useState("");
  const [ideaPrice, setIdeaPrice] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaLink, setIdeaLink] = useState("");
  const [ideaPhoto, setIdeaPhoto] = useState(null);
  const [addingIdea, setAddingIdea] = useState(false);

  if (!couple || !personA || !personB) return <div className="page"><button onClick={onBack}>&larr; back</button><p>Loading…</p></div>;

  const years = yearsMarried(couple.anniversaryDate);
  const theme = couple.married && years ? anniversaryTheme(years) : null;

  async function handleAddIdea() {
    if (!ideaName.trim()) return;
    setAddingIdea(true);
    try {
      await addCoupleGiftIdea({
        coupleId, title: ideaName.trim(), addedByUid: currentUid, photoFile: ideaPhoto,
        price: ideaPrice.trim() ? Number(ideaPrice) : null,
        description: ideaDescription.trim() || null,
        link: ideaLink.trim() || null,
      });
      setIdeaName(""); setIdeaPrice(""); setIdeaDescription(""); setIdeaLink(""); setIdeaPhoto(null);
    } finally {
      setAddingIdea(false);
    }
  }

  async function handleBought(idea) {
    const note = window.prompt("What did you get them, so you remember next year?", idea.title);
    if (note === null) return;
    await markCoupleGiftBought({ coupleId, ideaId: idea.id, addedByUid: currentUid, note: note.trim() || idea.title, year: new Date().getFullYear() });
  }
  async function handleDelete(idea) {
    if (window.confirm(`Delete "${idea.title}"?`)) {
      await deleteCoupleGiftIdea({ coupleId, ideaId: idea.id, photoPath: idea.photoPath });
    }
  }
  async function handleUnlink() {
    if (window.confirm(`Unlink ${personA.name} and ${personB.name} as a couple? (Nothing about either of them individually is deleted)`)) {
      await unlinkPartners({ personIdA: personA.id, personIdB: personB.id, coupleId });
      onBack();
    }
  }

  return (
    <div className="page">
      <button onClick={onBack} className="mono" style={{ background: "none", border: "none", cursor: "pointer" }}>
        &larr; back
      </button>

      <h1 className="name">{personA.name} &amp; {personB.name}</h1>
      {couple.anniversaryDate && (
        <div className="subline">
          {couple.married ? "Married" : "Together"} since {formatDob(couple.anniversaryDate)}
          {years !== null && ` · ${years} year${years === 1 ? "" : "s"}`}
          {theme && ` · this year's theme: ${theme}`}
        </div>
      )}
      <button className="mono" onClick={handleUnlink} style={{ marginTop: 6 }}>unlink couple</button>

      <div className="dropdown-row" style={{ marginTop: 20 }}>
        <div className="note likes">
          <h2 className="note-title" style={{ color: "var(--you)" }}>
            <button className="tag-item" onClick={() => onOpenPerson(personA.id)}>{personA.name}'s likes</button>
          </h2>
          <ul>
            {(personA.likes || []).map((l, i) => <li key={i}>{l}</li>)}
            {(personA.likes || []).length === 0 && <li className="mono" style={{ listStyle: "none" }}>Nothing recorded yet</li>}
          </ul>
        </div>
        <div className="note likes">
          <h2 className="note-title" style={{ color: "var(--you)" }}>
            <button className="tag-item" onClick={() => onOpenPerson(personB.id)}>{personB.name}'s likes</button>
          </h2>
          <ul>
            {(personB.likes || []).map((l, i) => <li key={i}>{l}</li>)}
            {(personB.likes || []).length === 0 && <li className="mono" style={{ listStyle: "none" }}>Nothing recorded yet</li>}
          </ul>
        </div>
      </div>

      <h3 style={{ fontWeight: 700, marginTop: 22 }}>Gift ideas for the two of them</h3>
      <div className="idea-form">
        <input placeholder="Name" value={ideaName} onChange={(e) => setIdeaName(e.target.value)} />
        <input placeholder="Price (optional)" type="number" value={ideaPrice} onChange={(e) => setIdeaPrice(e.target.value)} />
        <input placeholder="Link (optional)" value={ideaLink} onChange={(e) => setIdeaLink(e.target.value)} />
        <textarea placeholder="Description (optional)" value={ideaDescription} onChange={(e) => setIdeaDescription(e.target.value)} rows={2} />
        <input type="file" accept="image/*" onChange={(e) => setIdeaPhoto(e.target.files[0])} />
        <button onClick={handleAddIdea} disabled={addingIdea || !ideaName.trim()}>{addingIdea ? "Adding…" : "Add gift idea"}</button>
      </div>

      {giftIdeas.length === 0 && <p className="mono">No ideas yet.</p>}
      {giftIdeas.map((idea) => (
        <div key={idea.id} className="gift-card">
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 19, fontWeight: 700 }}>{idea.title}</div>
            {idea.price != null && <div className="mono">£{idea.price}</div>}
            {idea.description && <div>{idea.description}</div>}
            {idea.link && <a className="mono" href={idea.link} target="_blank" rel="noreferrer">link</a>}
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
    </div>
  );
}

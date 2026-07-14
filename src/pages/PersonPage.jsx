import React, { useEffect, useState } from "react";
import { doc, updateDoc, arrayUnion, collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { usePerson } from "../hooks/usePerson";
import { usePeople } from "../hooks/usePeople";
import {
  markGiftBought, deleteGiftIdea, addGiftIdea, addEvent,
  addGlobalQuestion, setAnswer, linkPartners,
} from "../hooks/giftActions";
import { formatAgeAndDob } from "../utils/date";

export default function PersonPage({ personId, currentUid, myLinkedPersonId, myColour, onBack, onOpenPerson, onOpenCouple }) {
  const { person, giftIdeas, pastGifts, events, isOwnPerson } = usePerson(personId, currentUid, myLinkedPersonId);
  const { people } = usePeople();

  // --- partner name lookup (just need the name for the header) ---
  const [partnerName, setPartnerName] = useState(null);
  useEffect(() => {
    if (!person?.partnerId) { setPartnerName(null); return; }
    return onSnapshot(doc(db, "people", person.partnerId), (snap) => {
      setPartnerName(snap.exists() ? snap.data().name : null);
    });
  }, [person?.partnerId]);

  // --- partner search + link flow ---
  const [linking, setLinking] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [candidateId, setCandidateId] = useState(null);
  const [annivDate, setAnnivDate] = useState("");
  const [married, setMarried] = useState(false);

  const candidates = people.filter(
    (p) => p.id !== personId && p.name.toLowerCase().includes(partnerSearch.trim().toLowerCase())
  );

  async function confirmLink() {
    if (!candidateId) return;
    await linkPartners({ personIdA: personId, personIdB: candidateId, anniversaryDate: annivDate, married });
    setLinking(false); setPartnerSearch(""); setCandidateId(null); setAnnivDate(""); setMarried(false);
  }

  // --- shared Q&A bank: global question list + this person's answers ---
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  useEffect(() => {
    const unsubQ = onSnapshot(collection(db, "questions"), (snap) =>
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubA = onSnapshot(collection(db, "people", personId, "answers"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data().value));
      setAnswers(map);
    });
    return () => { unsubQ(); unsubA(); };
  }, [personId]);

  async function editAnswer(questionId, currentValue) {
    const next = window.prompt("Answer:", currentValue || "");
    if (next === null) return;
    await setAnswer({ personId, questionId, value: next.trim(), updatedByUid: currentUid });
  }

  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionAnswer, setNewQuestionAnswer] = useState("");
  async function submitNewQuestion() {
    if (!newQuestionLabel.trim()) return;
    const docRef = await addGlobalQuestion({ label: newQuestionLabel.trim(), createdByUid: currentUid });
    if (newQuestionAnswer.trim()) {
      await setAnswer({ personId, questionId: docRef.id, value: newQuestionAnswer.trim(), updatedByUid: currentUid });
    }
    setNewQuestionLabel(""); setNewQuestionAnswer("");
  }

  // --- likes / dislikes: edit existing (click) + add new ---
  const [newLike, setNewLike] = useState("");
  const [newDislike, setNewDislike] = useState("");

  async function editListItem(field, index) {
    const current = person[field] || [];
    const existing = current[index];
    const next = window.prompt("Edit (clear the text to delete this one):", existing);
    if (next === null) return;
    const updated = [...current];
    if (next.trim() === "") updated.splice(index, 1);
    else updated[index] = next.trim();
    await updateDoc(doc(db, "people", personId), { [field]: updated });
  }

  async function addListItem(field, value, clear) {
    if (!value.trim()) return;
    await updateDoc(doc(db, "people", personId), { [field]: arrayUnion(value.trim()) });
    clear("");
  }

  // --- info: editable ---
  const [infoDraft, setInfoDraft] = useState(person?.info || "");
  const [infoEditing, setInfoEditing] = useState(false);
  useEffect(() => setInfoDraft(person?.info || ""), [person?.info]);
  async function saveInfo() {
    await updateDoc(doc(db, "people", personId), { info: infoDraft.trim() });
    setInfoEditing(false);
  }

  // --- events: add (read already comes from usePerson) ---
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  async function submitEvent() {
    if (!newEventTitle.trim()) return;
    await addEvent({ personId, title: newEventTitle.trim(), date: newEventDate, createdByUid: currentUid });
    setNewEventTitle(""); setNewEventDate("");
  }

  // --- structured gift idea form ---
  const [ideaName, setIdeaName] = useState("");
  const [ideaPrice, setIdeaPrice] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaLink, setIdeaLink] = useState("");
  const [ideaPhoto, setIdeaPhoto] = useState(null);
  const [addingIdea, setAddingIdea] = useState(false);

  async function handleAddIdea() {
    if (!ideaName.trim()) return;
    setAddingIdea(true);
    try {
      await addGiftIdea({
        personId, title: ideaName.trim(), addedByUid: currentUid, photoFile: ideaPhoto,
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
    const note = window.prompt("Nice one — what did you get, so you remember next year?", idea.title);
    if (note === null) return;
    await markGiftBought({ personId, ideaId: idea.id, addedByUid: currentUid, note: note.trim() || idea.title, year: new Date().getFullYear() });
  }
  async function handleDelete(idea) {
    if (window.confirm(`Delete "${idea.title}"?`)) {
      await deleteGiftIdea({ personId, ideaId: idea.id, photoPath: idea.photoPath });
    }
  }

  if (!person) return <div className="page"><button onClick={onBack}>&larr; back</button><p>Loading…</p></div>;

  return (
    <div className="page">
      <button onClick={onBack} className="mono" style={{ background: "none", border: "none", cursor: "pointer" }}>
        &larr; back to everyone
      </button>

      <h1 className="name">
        {person.name}
        {" "}
        {partnerName ? (
          <>
            <span className="mono" style={{ fontWeight: 400 }}>+</span>{" "}
            <button className="tag-item" style={{ fontStyle: "italic", fontSize: "inherit" }} onClick={() => onOpenPerson(person.partnerId)}>
              {partnerName}
            </button>
            {" "}
            <button className="mono" style={{ fontSize: 13 }} onClick={() => onOpenCouple(person.coupleId)}>couple view</button>
          </>
        ) : (
          <button className="mono" style={{ fontSize: 14 }} onClick={() => setLinking((v) => !v)}>+ Partner?</button>
        )}
      </h1>

      {linking && (
        <div className="idea-form" style={{ marginBottom: 16 }}>
          <input
            placeholder="Search for their name…" value={partnerSearch}
            onChange={(e) => { setPartnerSearch(e.target.value); setCandidateId(null); }}
          />
          {partnerSearch && !candidateId && (
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {candidates.slice(0, 8).map((c) => (
                <div key={c.id} className="mono" style={{ padding: "6px 2px", cursor: "pointer" }} onClick={() => { setCandidateId(c.id); setPartnerSearch(c.name); }}>
                  {c.name}
                </div>
              ))}
              {candidates.length === 0 && <div className="mono">No one matches.</div>}
            </div>
          )}
          {candidateId && (
            <>
              <label className="mono">Anniversary date (optional)</label>
              <input type="date" value={annivDate} onChange={(e) => setAnnivDate(e.target.value)} />
              <label className="mono">
                <input type="checkbox" checked={married} onChange={(e) => setMarried(e.target.checked)} /> Married?
              </label>
              <button onClick={confirmLink}>Link as partner</button>
            </>
          )}
        </div>
      )}

      <div className="subline">{formatAgeAndDob(person.birthdate)}</div>
      {isOwnPerson && (
        <p className="mono" style={{ color: "var(--soon)" }}>
          This is you — you're only seeing gift ideas you added yourself.
        </p>
      )}

      {/* Info + Events, side by side, each its own dropdown */}
      <div className="dropdown-row">
        <details className="dropdown-section" open>
          <summary className="mono">Info</summary>
          <div style={{ marginTop: 10 }}>
            {infoEditing ? (
              <>
                <textarea value={infoDraft} onChange={(e) => setInfoDraft(e.target.value)} rows={4} style={{ width: "100%" }} />
                <button onClick={saveInfo} style={{ marginTop: 6 }}>Save</button>
              </>
            ) : (
              <>
                <p>{person.info || <span className="mono">Nothing recorded yet.</span>}</p>
                <button className="mono" onClick={() => setInfoEditing(true)}>edit</button>
              </>
            )}

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dotted var(--paper-edge)" }}>
              <div className="mono" style={{ fontWeight: 700, marginBottom: 6 }}>Q&amp;A</div>
              {questions.length === 0 && <p className="mono">No shared questions set up yet.</p>}
              {questions.map((q) => (
                <div key={q.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{q.label}</div>
                  <button className="tag-item mono" onClick={() => editAnswer(q.id, answers[q.id])}>
                    {answers[q.id] || "tap to answer"}
                  </button>
                </div>
              ))}
              <div className="stacked-form">
                <input placeholder="New shared question (asked for everyone)" value={newQuestionLabel} onChange={(e) => setNewQuestionLabel(e.target.value)} />
                <input placeholder={`${person.name}'s answer (optional)`} value={newQuestionAnswer} onChange={(e) => setNewQuestionAnswer(e.target.value)} />
                <button onClick={submitNewQuestion} disabled={!newQuestionLabel.trim()}>Add question</button>
              </div>
            </div>
          </div>
        </details>

        <details className="dropdown-section">
          <summary className="mono">Events</summary>
          <div style={{ marginTop: 10 }}>
            {events.length === 0 && <p className="mono">No events yet.</p>}
            {events.map((e) => (
              <div key={e.id} style={{ padding: "6px 0" }}>
                <div style={{ fontWeight: 700 }}>{e.title}</div>
                {e.date && <div className="mono">{e.date}</div>}
              </div>
            ))}
            <div className="stacked-form">
              <input placeholder="Event title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
              <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
              <button onClick={submitEvent} disabled={!newEventTitle.trim()}>Add</button>
            </div>
          </div>
        </details>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 20, marginBottom: 22 }}>
        <div className="note likes">
          <h2 className="note-title" style={{ color: "var(--you)" }}>Likes</h2>
          <ul>
            {(person.likes || []).map((l, i) => (
              <li key={i}><button className="tag-item" onClick={() => editListItem("likes", i)}>{l}</button></li>
            ))}
          </ul>
          <div className="stacked-form">
            <input placeholder="Add a like…" value={newLike} onChange={(e) => setNewLike(e.target.value)} />
            <button onClick={() => addListItem("likes", newLike, setNewLike)} disabled={!newLike.trim()}>Add</button>
          </div>
        </div>
        <div className="note dislikes">
          <h2 className="note-title" style={{ color: "var(--tab-qa)" }}>Dislikes</h2>
          <ul>
            {(person.dislikes || []).map((l, i) => (
              <li key={i}><button className="tag-item" onClick={() => editListItem("dislikes", i)}>{l}</button></li>
            ))}
          </ul>
          <div className="stacked-form">
            <input placeholder="Add a dislike…" value={newDislike} onChange={(e) => setNewDislike(e.target.value)} />
            <button onClick={() => addListItem("dislikes", newDislike, setNewDislike)} disabled={!newDislike.trim()}>Add</button>
          </div>
        </div>
      </div>

      <h3 style={{ fontWeight: 700 }}>Current gift ideas</h3>
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
    </div>
  );
}

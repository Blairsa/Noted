import React, { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { usePeople } from "../hooks/usePeople";
import { useCouples } from "../hooks/useCouples";
import { quickAddToMany, addCoupleGiftIdea } from "../hooks/giftActions";
import { functions } from "../firebase";

export default function QuickAdd({ currentUid, onClose, sharedData }) {
  const { people } = usePeople();
  const { couples } = useCouples();
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [selectedCouples, setSelectedCouples] = useState(new Set());
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const peopleById = useMemo(() => {
    const map = {};
    people.forEach((p) => (map[p.id] = p));
    return map;
  }, [people]);

  const couplesWithNames = useMemo(
    () => couples.map((c) => ({
      ...c,
      displayName: c.personIds.map((id) => peopleById[id]?.name).filter(Boolean).join(" & "),
    })),
    [couples, peopleById]
  );

  const term = search.toLowerCase();
  const filteredPeople = people.filter((p) => p.name.toLowerCase().includes(term));
  const filteredCouples = couplesWithNames.filter((c) => c.displayName.toLowerCase().includes(term));

  // Arriving via "Share to Noted" (see App.jsx + manifest.json share_target).
  // Pre-fill title/link straight away, then best-effort enrich with photo/
  // price by unfurling the link server-side. If that fails, title+link from
  // the share itself are already enough to save - see fetchDetails below.
  useEffect(() => {
    if (!sharedData) return;
    if (sharedData.title) setTitle(sharedData.title);
    if (sharedData.url) {
      setLink(sharedData.url);
      fetchDetails(sharedData.url, !sharedData.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedData]);

  async function fetchDetails(url, useTitleFromFetch) {
    if (!url) return;
    setFetchingDetails(true);
    setFetchError(null);
    try {
      const unfurl = httpsCallable(functions, "unfurlShareUrl");
      const { data } = await unfurl({ url });
      if (useTitleFromFetch && data.title) setTitle(data.title);
      if (data.image) setPhotoUrl(data.image);
      if (data.price) setPrice(data.price);
    } catch (err) {
      setFetchError("Couldn't auto-fill from that link — add the details yourself.");
    } finally {
      setFetchingDetails(false);
    }
  }

  function togglePerson(id) {
    const next = new Set(selectedPeople);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedPeople(next);
  }
  function toggleCouple(id) {
    const next = new Set(selectedCouples);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedCouples(next);
  }

  async function save() {
    const totalSelected = selectedPeople.size + selectedCouples.size;
    if (!title.trim() || totalSelected === 0) return;
    setSaving(true);
    try {
      const jobs = [];
      const extra = {
        link: link.trim() || null,
        price: price.trim() || null,
        photoUrl: photoUrl || null,
      };
      if (selectedPeople.size > 0) {
        jobs.push(quickAddToMany({
          personIds: Array.from(selectedPeople), title: title.trim(), addedByUid: currentUid, photoFile, ...extra,
        }));
      }
      for (const coupleId of selectedCouples) {
        jobs.push(addCoupleGiftIdea({
          coupleId, title: title.trim(), addedByUid: currentUid, photoFile, ...extra,
        }));
      }
      await Promise.all(jobs);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const totalSelected = selectedPeople.size + selectedCouples.size;

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
        <label className="mono">Who's it for? (people or couples - tick as many as you like)</label>
        <input
          type="text" placeholder="search names…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 6, marginBottom: 8 }}
        />
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--paper-edge)", borderRadius: 5 }}>
          {filteredCouples.length > 0 && (
            <>
              <div className="mono" style={{ padding: "6px 10px", fontSize: 11, color: "var(--ink-soft)" }}>Couples</div>
              {filteredCouples.map((c) => (
                <label key={c.id} style={{ display: "flex", gap: 8, padding: "8px 10px", alignItems: "center", fontStyle: "italic" }}>
                  <input type="checkbox" checked={selectedCouples.has(c.id)} onChange={() => toggleCouple(c.id)} />
                  {c.displayName}
                </label>
              ))}
              <div className="mono" style={{ padding: "6px 10px", fontSize: 11, color: "var(--ink-soft)" }}>People</div>
            </>
          )}
          {filteredPeople.map((p) => (
            <label key={p.id} style={{ display: "flex", gap: 8, padding: "8px 10px", alignItems: "center" }}>
              <input type="checkbox" checked={selectedPeople.has(p.id)} onChange={() => togglePerson(p.id)} />
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

        <label className="mono" style={{ display: "block", marginTop: 12 }}>Link (optional)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="url" value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="paste or shared automatically"
            style={{ flex: 1, padding: 9 }}
          />
          <button
            type="button" onClick={() => fetchDetails(link, false)}
            disabled={!link.trim() || fetchingDetails}
            style={{ padding: "0 12px" }}
          >
            {fetchingDetails ? "…" : "✨ fetch"}
          </button>
        </div>
        {fetchError && <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{fetchError}</p>}
        {photoUrl && (
          <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            Found a photo from the link (saved, not shown yet — display UI coming later).
          </p>
        )}

        <label className="mono" style={{ display: "block", marginTop: 12 }}>Price (optional)</label>
        <input
          type="text" value={price} onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. £24.99"
          style={{ width: "100%", padding: 9 }}
        />

        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} style={{ marginTop: 12 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--ink-soft)" }}>Cancel</button>
          <button
            onClick={save} disabled={saving}
            style={{ flex: 1, background: "var(--you)", color: "#fff", border: "none", padding: 11, borderRadius: 6 }}
          >
            {saving ? "Saving…" : `Save idea${totalSelected > 1 ? ` for ${totalSelected}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

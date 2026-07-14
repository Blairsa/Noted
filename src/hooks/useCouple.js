import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useCouple(coupleId) {
  const [couple, setCouple] = useState(null);
  const [giftIdeas, setGiftIdeas] = useState([]);
  const [pastGifts, setPastGifts] = useState([]);

  useEffect(() => {
    if (!coupleId) return;
    const unsubCouple = onSnapshot(doc(db, "couples", coupleId), (snap) => {
      setCouple(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    const unsubIdeas = onSnapshot(
      query(collection(db, "couples", coupleId, "giftIdeas"), orderBy("createdAt", "desc")),
      (snap) => setGiftIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPast = onSnapshot(
      query(collection(db, "couples", coupleId, "pastGifts"), orderBy("year", "desc")),
      (snap) => setPastGifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubCouple(); unsubIdeas(); unsubPast(); };
  }, [coupleId]);

  return { couple, giftIdeas, pastGifts };
}

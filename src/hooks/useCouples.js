import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useCouples() {
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "couples"), (snap) => {
      setCouples(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { couples, loading };
}

// Same "this month" window as birthdaysThisMonth, plus pinned support so a
// couple can lead the strip the same way a pinned person can.
// peopleById lets the caller attach display names without a second query.
export function anniversariesThisMonth(couples, peopleById) {
  const now = new Date();

  const withDaysAway = couples
    .filter((c) => c.anniversaryDate)
    .map((c) => {
      const [, m, d] = c.anniversaryDate.split("-").map(Number);
      const nextOccurrence = new Date(now.getFullYear(), m - 1, d);
      if (nextOccurrence < now) nextOccurrence.setFullYear(now.getFullYear() + 1);
      const daysAway = Math.round((nextOccurrence - now) / 86400000);
      const names = c.personIds.map((id) => peopleById[id]?.name).filter(Boolean);
      return { ...c, daysAway, names };
    });

  const pinned = withDaysAway.filter((c) => c.pinned);
  const pinnedIds = new Set(pinned.map((c) => c.id));

  const upcoming = withDaysAway
    .filter((c) => !pinnedIds.has(c.id))
    .filter((c) => c.daysAway >= 0 && c.daysAway <= 37)
    .sort((a, b) => a.daysAway - b.daysAway);

  return [...pinned, ...upcoming];
}

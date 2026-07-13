import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";

export function usePeople({ includeArchived = false } = {}) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const constraints = [orderBy("name")];
    if (!includeArchived) constraints.unshift(where("archived", "==", false));
    const q = query(collection(db, "people"), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [includeArchived]);

  return { people, loading };
}

// "This month" = birthdays in the current month, or within 7 days either side
// of the month boundary. Anyone with `pinned: true` on their person doc
// (e.g. an "Us" anniversary entry) always leads the strip regardless of how
// far away their date actually is - set that flag directly on the doc in
// Firestore Console to pin someone.
export function birthdaysThisMonth(people) {
  const now = new Date();

  const withDaysAway = people
    .filter((p) => !p.archived && p.birthdate)
    .map((p) => {
      const bday = new Date(p.birthdate);
      const nextOccurrence = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (nextOccurrence < now) nextOccurrence.setFullYear(now.getFullYear() + 1);
      const daysAway = Math.round((nextOccurrence - now) / 86400000);
      return { ...p, daysAway };
    });

  const pinned = withDaysAway.filter((p) => p.pinned);
  const pinnedIds = new Set(pinned.map((p) => p.id));

  const upcoming = withDaysAway
    .filter((p) => !pinnedIds.has(p.id))
    .filter((p) => p.daysAway >= 0 && p.daysAway <= 37)
    .sort((a, b) => a.daysAway - b.daysAway);

  return [...pinned, ...upcoming];
}

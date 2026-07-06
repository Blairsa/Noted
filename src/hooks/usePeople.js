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

// "This month" = birthdays in the current month, or within 7 days either side of
// the month boundary, so nothing gets missed at the edges.
export function birthdaysThisMonth(people) {
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);

  return people
    .filter((p) => !p.archived && p.birthdate)
    .map((p) => {
      const bday = new Date(p.birthdate);
      const nextOccurrence = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (nextOccurrence < now) nextOccurrence.setFullYear(now.getFullYear() + 1);
      const daysAway = Math.round((nextOccurrence - now) / 86400000);
      return { ...p, daysAway };
    })
    .filter((p) => p.daysAway >= 0 && p.daysAway <= 37) // this month + ~1 week lookahead
    .sort((a, b) => a.daysAway - b.daysAway);
}

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * IMPORTANT — self-block implementation note:
 *
 * Firestore security rules are not filters. A query either returns in full or is
 * denied entirely — if a rule could deny access to even one document a query might
 * return, Firestore rejects the whole request rather than silently hiding that one
 * document. (See: https://firebase.google.com/docs/firestore/security/rules-query)
 *
 * So the self-block ("you can't see what your partner added for your own gifts")
 * can't be done by just writing a permissive-looking rule and letting Firestore
 * hide the docs you shouldn't see. The CLIENT must ask a pre-constrained question:
 *
 *   - Viewing someone else's page  -> query giftIdeas with no constraint (rule
 *     allows this because `personId != myLinkedPersonId` is true for the whole
 *     collection path, regardless of any single document's contents).
 *   - Viewing your OWN page        -> query giftIdeas WHERE addedByUid == myUid
 *     (rule allows this because the query now provably only returns docs that
 *     satisfy `resource.data.addedByUid == request.auth.uid` for every result).
 *
 * If you ever remove the `where("addedByUid", ...)` clause below for the "own
 * page" case, every read will start throwing permission-denied — that's the
 * canary that this got broken, not a rules problem to "loosen".
 */
export function usePerson(personId, currentUid, myLinkedPersonId) {
  const [person, setPerson] = useState(null);
  const [giftIdeas, setGiftIdeas] = useState([]);
  const [pastGifts, setPastGifts] = useState([]);
  const [events, setEvents] = useState([]);

  const isOwnPerson = personId && personId === myLinkedPersonId;

  useEffect(() => {
    if (!personId) return;

    const unsubPerson = onSnapshot(doc(db, "people", personId), (snap) => {
      setPerson(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    const ideasBase = collection(db, "people", personId, "giftIdeas");
    const ideasQuery = isOwnPerson
      ? query(ideasBase, where("addedByUid", "==", currentUid), orderBy("createdAt", "desc"))
      : query(ideasBase, orderBy("createdAt", "desc"));
    const unsubIdeas = onSnapshot(ideasQuery, (snap) =>
      setGiftIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    // Past gifts and events aren't self-blocked in this design - only "current
    // gift ideas" carries the surprise-spoiling risk. Revisit if that changes.
    const unsubPast = onSnapshot(
      query(collection(db, "people", personId, "pastGifts"), orderBy("year", "desc")),
      (snap) => setPastGifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubEvents = onSnapshot(
      collection(db, "people", personId, "events"),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubPerson();
      unsubIdeas();
      unsubPast();
      unsubEvents();
    };
  }, [personId, isOwnPerson, currentUid]);

  return { person, giftIdeas, pastGifts, events, isOwnPerson };
}

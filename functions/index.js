const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { google } = require("googleapis");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();
const db = getFirestore();
// ---------------------------------------------------------------------------
// unfurlShareUrl — called from QuickAdd when a link comes in via "Share to
// Noted" (or is pasted manually). Fetches the page server-side (avoids
// browser CORS) and reads whatever og:/twitter:/JSON-LD metadata the page
// exposes for its own link previews. Best-effort: any field it can't find
// just comes back null, and the client already has title+link from the share
// itself regardless.
// ---------------------------------------------------------------------------
exports.unfurlShareUrl = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");

  const url = request.data?.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new HttpsError("invalid-argument", "A valid http(s) url is required.");
  }

  const res = await fetch(url, {
    headers: {
      // Most sites only populate og:/JSON-LD product data for crawler-like
      // requests (that's what makes iMessage/WhatsApp previews work) - a
      // plain browser UA can get a stripped-down page on some sites.
      "User-Agent": "Mozilla/5.0 (compatible; NotedLinkPreview/1.0)",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new HttpsError("not-found", `Could not fetch that link (${res.status}).`);
  const html = await res.text();

  const title = metaTag(html, "og:title") || metaTag(html, "twitter:title") || titleTag(html);
  const image = metaTag(html, "og:image") || metaTag(html, "twitter:image");
  const price = metaTag(html, "product:price:amount") || metaTag(html, "og:price:amount") || priceFromJsonLd(html);

  return { title: title || null, image: image || null, price: price || null };
});

function metaTag(html, prop) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function titleTag(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? decodeHtmlEntities(m[1]) : null;
}

function priceFromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, block] of blocks) {
    try {
      const data = JSON.parse(block);
      const node = Array.isArray(data) ? data.find((d) => d.offers) : data;
      const amount = node?.offers?.price ?? node?.offers?.[0]?.price;
      if (amount) return String(amount);
    } catch { /* not valid JSON-LD, skip it */ }
  }
  return null;
}

function decodeHtmlEntities(str) {
  return str.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
// ---------------------------------------------------------------------------
// monthlyReminders — fires 1st of every month. Pushes to each user who has
// opted in (personPrefs/groupPrefs), not to everyone regardless of preference.
// ---------------------------------------------------------------------------
exports.monthlyReminders = onSchedule("0 9 1 * *", async () => {
  const peopleSnap = await db.collection("people").where("archived", "==", false).get();
  const now = new Date();

  const upcoming = peopleSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.birthdate)
    .map((p) => {
      const bday = new Date(p.birthdate);
      const next = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return { ...p, daysAway: Math.round((next - now) / 86400000) };
    })
    .filter((p) => p.daysAway >= 0 && p.daysAway <= 37);

  if (upcoming.length === 0) return;

  // TODO: for each user, filter `upcoming` down to only the people they've
  // opted into via users/{uid}/personPrefs/{personId}.birthdayReminders, then
  // send a single FCM push per user rather than one per person. Left as a
  // TODO because it needs each user's FCM registration token, which requires
  // the client to request notification permission and write the token
  // somewhere (e.g. users/{uid}.fcmToken) - not yet wired up client-side.
  console.log(`${upcoming.length} birthdays in the next ~5 weeks - notify opted-in users`);
});

// ---------------------------------------------------------------------------
// syncPersonToCalendar — immediate, app -> Calendar direction.
// Fires whenever a person doc is created/updated and upserts the matching
// event on the shared "Birthdays" calendar (owned by Sam's Google account).
// ---------------------------------------------------------------------------
exports.syncPersonToCalendar = onDocumentWritten("people/{personId}", async (event) => {
  const after = event.data.after.data();
  if (!after || !after.birthdate) return;

  const calendar = await getCalendarClient();
  const calendarId = await getCalendarId();

  const eventBody = {
    summary: `${after.name}'s birthday`,
    start: { date: after.birthdate },
    end: { date: after.birthdate },
    recurrence: ["RRULE:FREQ=YEARLY"],
  };

  if (after.calendarEventId) {
    await calendar.events.update({ calendarId, eventId: after.calendarEventId, requestBody: eventBody });
  } else {
    const created = await calendar.events.insert({ calendarId, requestBody: eventBody });
    await db.doc(`people/${event.params.personId}`).update({ calendarEventId: created.data.id });
  }
});

// ---------------------------------------------------------------------------
// monthlyCalendarPull — the other direction, Calendar -> app. Runs monthly
// (not via webhook - see spec §3, deliberate simplification) and writes
// mismatches to syncReview for manual approval rather than silently
// overwriting whatever's in the app.
// ---------------------------------------------------------------------------
exports.monthlyCalendarPull = onSchedule("0 9 2 * *", async () => {
  const calendar = await getCalendarClient();
  const calendarId = await getCalendarId();

  const { data } = await calendar.events.list({ calendarId, maxResults: 250, singleEvents: true });
  const peopleSnap = await db.collection("people").get();
  const byCalendarEventId = new Map(
    peopleSnap.docs.map((d) => [d.data().calendarEventId, { id: d.id, ...d.data() }])
  );

  for (const calEvent of data.items || []) {
    const person = byCalendarEventId.get(calEvent.id);
    const calDate = calEvent.start?.date;
    if (person && calDate && calDate !== person.birthdate) {
      await db.collection("syncReview").add({
        personId: person.id,
        field: "birthdate",
        calendarValue: calDate,
        appValue: person.birthdate,
        detectedAt: new Date().toISOString(),
      });
    }
    // TODO: handle calEvent.id with no matching person -> flag as "new person
    // found in calendar, add to Noted?" rather than silently ignoring it.
  }
});

// ---------------------------------------------------------------------------
// cleanupBoughtPhoto — deletes the Storage photo once a gift idea's status
// flips to "bought" and the client has already written the past-gift note.
// ---------------------------------------------------------------------------
exports.cleanupBoughtPhoto = onDocumentUpdated("people/{personId}/giftIdeas/{ideaId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status !== "bought" && after.status === "bought" && after.photoPath) {
    await getStorage().bucket().file(after.photoPath).delete().catch(() => {});
  }
});

// ---------------------------------------------------------------------------
async function getCalendarId() {
  // Deliberately NOT a CLI-set secret - a calendar ID isn't sensitive, and this
  // way it's editable purely from the Firebase Console's Firestore data tab
  // (create a doc at config/settings with a field `birthdaysCalendarId`) rather
  // than needing `firebase functions:secrets:set` from a terminal.
  const doc = await db.doc("config/settings").get();
  const id = doc.data()?.birthdaysCalendarId;
  if (!id) throw new Error("Set config/settings.birthdaysCalendarId in the Firestore Console first.");
  return id;
}

async function getCalendarClient() {
  // Service account needs to be added as an editor on the shared "Birthdays"
  // calendar (Calendar settings > Share with specific people > paste the
  // service account's email, found in Firebase console > Project settings >
  // Service accounts). Domain-wide delegation is NOT needed since it's a
  // personally-owned calendar, not a Workspace one.
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth: await auth.getClient() });
}

import {
  addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp,
  setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// --- gift ideas ---------------------------------------------------------

export async function addGiftIdea({ personId, title, addedByUid, photoFile }) {
  let photoPath = null;
  if (photoFile) {
    photoPath = `people/${personId}/giftIdeas/${crypto.randomUUID()}.webp`;
    const compressed = await compressImage(photoFile);
    await uploadBytes(ref(storage, photoPath), compressed);
  }
  await addDoc(collection(db, "people", personId, "giftIdeas"), {
    title, addedByUid, photoPath, status: "idea", createdAt: serverTimestamp(),
  });
}

// Quick-add the same idea to several people at once. Photos are duplicated per
// person (see spec §2E) rather than shared by path, so one person's "mark as
// bought" cleanup can never delete a photo another person's card still needs.
export async function quickAddToMany({ personIds, title, addedByUid, photoFile }) {
  let compressed = null;
  if (photoFile) compressed = await compressImage(photoFile);

  const batch = writeBatch(db);
  for (const personId of personIds) {
    let photoPath = null;
    if (compressed) {
      photoPath = `people/${personId}/giftIdeas/${crypto.randomUUID()}.webp`;
      await uploadBytes(ref(storage, photoPath), compressed); // duplicate upload, deliberate
    }
    const ideaRef = doc(collection(db, "people", personId, "giftIdeas"));
    batch.set(ideaRef, { title, addedByUid, photoPath, status: "idea", createdAt: serverTimestamp() });
  }
  await batch.commit();
}

// Mark bought: caller collects the "what did you actually get" note in the UI
// first, then calls this - it writes the past-gift record and deletes the idea
// doc. The photo itself is cleaned up server-side by cleanupBoughtPhoto (see
// functions/index.js) rather than here, so it survives even if this call fails
// partway and needs retrying.
export async function markGiftBought({ personId, ideaId, addedByUid, note, year }) {
  await addDoc(collection(db, "people", personId, "pastGifts"), {
    year, note, addedByUid, originalIdeaId: ideaId,
  });
  await deleteDoc(doc(db, "people", personId, "giftIdeas", ideaId));
}

export async function deleteGiftIdea({ personId, ideaId, photoPath }) {
  await deleteDoc(doc(db, "people", personId, "giftIdeas", ideaId));
  if (photoPath) {
    try { await deleteObject(ref(storage, photoPath)); } catch { /* already gone */ }
  }
}

// --- shared Q&A question bank ------------------------------------------

export async function addGlobalQuestion({ label, createdByUid }) {
  return addDoc(collection(db, "questions"), { label, createdByUid, createdAt: serverTimestamp() });
}

export async function setAnswer({ personId, questionId, value, updatedByUid }) {
  await setDoc(doc(db, "people", personId, "answers", questionId), {
    value, updatedByUid, updatedAt: serverTimestamp(),
  });
}

export async function getAllQuestions() {
  const snap = await getDocs(collection(db, "questions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- image compression ---------------------------------------------------
// Resize to a max 800px dimension and re-encode as WebP before it ever reaches
// Storage - keeps "current gift idea" photos small since most get deleted
// within weeks anyway (see markGiftBought above).
async function compressImage(file, maxDimension = 800, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

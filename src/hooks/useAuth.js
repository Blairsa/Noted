import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

// Colours offered on first sign-in. The user can change theirs later in Settings
// (users/{uid}.colour) - this is just a sane default so dots aren't blank day one.
const DEFAULT_COLOURS = ["#3E7C6B", "#B25F45"];

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // the users/{uid} doc data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const newProfile = {
            displayName: firebaseUser.displayName || "",
            colour: DEFAULT_COLOURS[Math.floor(Math.random() * DEFAULT_COLOURS.length)],
            linkedPersonId: null,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        } else {
          setProfile(snap.data());
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return { user, profile, loading, login, logout };
}

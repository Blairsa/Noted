import React, { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import PersonPage from "./pages/PersonPage";
import CouplePage from "./pages/CouplePage";
import Settings from "./pages/Settings";
import QuickAdd from "./components/QuickAdd";

function extractUrlFromText(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

export default function App() {
  const { user, profile, loading, login, logout } = useAuth();
  const [openPersonId, setOpenPersonId] = useState(null);
  const [openCoupleId, setOpenCoupleId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sharedData, setSharedData] = useState(null);

  // "Share to Noted" landing point - see manifest.json's share_target, which
  // points here. Some apps (esp. Instagram) put the link inside `text`
  // rather than a separate `url` param, so we fall back to pulling a URL out
  // of the text. If `text` turns out to just BE the url with nothing else,
  // don't use it as the title too - leave title blank rather than ugly.
  useEffect(() => {
    if (window.location.pathname !== "/quick-add") return;
    const params = new URLSearchParams(window.location.search);
    const rawText = params.get("text") || "";
    const url = params.get("url") || extractUrlFromText(rawText) || "";
    const titleParam = params.get("title") || "";
    const title = titleParam || (rawText.trim() === url ? "" : rawText);

    if (title || url) {
      setSharedData({ title, url });
      setQuickAddOpen(true);
    }
    window.history.replaceState({}, "", "/");
  }, []);

  if (loading) return <div className="page">Loading…</div>;
  if (!user) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 100 }}>
        <h1 className="name">Noted</h1>
        <p className="mono">A shared gift-idea notebook.</p>
        <button onClick={login} style={{ padding: "12px 24px", marginTop: 20 }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  function openPerson(id) {
    setOpenCoupleId(null);
    setOpenPersonId(id);
  }
  function openCouple(id) {
    setOpenPersonId(null);
    setOpenCoupleId(id);
  }
  function closeQuickAdd() {
    setQuickAddOpen(false);
    setSharedData(null);
  }

  return (
    <>
      {settingsOpen ? (
        <Settings onBack={() => setSettingsOpen(false)} />
      ) : openCoupleId ? (
        <CouplePage
          coupleId={openCoupleId}
          currentUid={user.uid}
          myColour={profile?.colour}
          onBack={() => setOpenCoupleId(null)}
          onOpenPerson={openPerson}
        />
      ) : openPersonId ? (
        <PersonPage
          personId={openPersonId}
          currentUid={user.uid}
          myLinkedPersonId={profile?.linkedPersonId}
          myColour={profile?.colour}
          onBack={() => setOpenPersonId(null)}
          onOpenPerson={openPerson}
          onOpenCouple={openCouple}
        />
      ) : (
        <Home
          onOpenPerson={openPerson}
          onOpenCouple={openCouple}
          onOpenQuickAdd={() => setQuickAddOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {quickAddOpen && (
        <QuickAdd currentUid={user.uid} onClose={closeQuickAdd} sharedData={sharedData} />
      )}
      <button onClick={logout} className="mono" style={{
        position: "fixed", top: 10, right: 10, background: "none", border: "none",
        color: "var(--ink-soft)", cursor: "pointer",
      }}>
        sign out
      </button>
    </>
  );
}

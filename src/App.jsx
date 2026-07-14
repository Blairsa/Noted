import React, { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import PersonPage from "./pages/PersonPage";
import CouplePage from "./pages/CouplePage";
import Settings from "./pages/Settings";
import QuickAdd from "./components/QuickAdd";

export default function App() {
  const { user, profile, loading, login, logout } = useAuth();
  const [openPersonId, setOpenPersonId] = useState(null);
  const [openCoupleId, setOpenCoupleId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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
        <QuickAdd currentUid={user.uid} onClose={() => setQuickAddOpen(false)} />
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

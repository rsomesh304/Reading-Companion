import { Cloud, Download, HardDrive, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountContext } from "./AccountContext.js";
import "./AccountGate.css";
import {
  ACCOUNT_SYNC_META_KEY,
  accountCopyDecision,
  collectLocalReaderSnapshot,
  fetchAccountSnapshot,
  hasLocalReaderData,
  localReaderCacheBelongsToAnotherAccount,
  readAccountSyncMeta,
  readerSnapshotSignature,
  restoreLocalReaderSnapshot,
  saveAccountSnapshot,
  writeAccountSyncMeta,
} from "./accountSync.js";
import { supabaseClient, supabaseConfigured } from "./supabaseClient.js";

const EMPTY_SNAPSHOT = { version: 1, data: {} };

export default function AccountGate({ children }) {
  const [session, setSession] = useState(null);
  const [sessionKnown, setSessionKnown] = useState(!supabaseConfigured);
  const [phase, setPhase] = useState(supabaseConfigured ? "checking" : "unconfigured");
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [error, setError] = useState("");
  const localSnapshotRef = useRef(null);
  const remoteSnapshotRef = useRef(null);
  const syncTimerRef = useRef(null);
  const prepareIdRef = useRef(0);
  const syncInFlightRef = useRef(false);
  const queuedSyncRef = useRef(false);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    let alive = true;
    let authEventObserved = false;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      authEventObserved = true;
      if (!alive) return;
      setSession(nextSession);
      setSessionKnown(true);
      if (!nextSession) setPhase("signed-out");
    });
    supabaseClient.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive || authEventObserved) return;
      const nextSession = data?.session || null;
      if (sessionError) setError(sessionError.message);
      setSession(nextSession);
      setSessionKnown(true);
      setPhase(nextSession ? "loading-data" : "signed-out");
    }).catch((sessionError) => {
      if (!alive) return;
      setError(sessionError?.message || "Could not check the current account.");
      setSessionKnown(true);
      setPhase("signed-out");
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!sessionKnown || !session?.user?.id || !supabaseClient) return undefined;
    const userId = session.user.id;
    const prepareId = ++prepareIdRef.current;
    let cancelled = false;
    const prepare = async () => {
      try {
        await Promise.resolve();
        if (cancelled || prepareId !== prepareIdRef.current) return;
        setError("");
        setPhase("loading-data");
        const local = collectLocalReaderSnapshot();
        const localHasData = hasLocalReaderData(local);
        const remote = await fetchAccountSnapshot(supabaseClient, userId);
        if (cancelled || prepareId !== prepareIdRef.current) return;
        const meta = readAccountSyncMeta();
        if (localReaderCacheBelongsToAnotherAccount(userId, meta)) {
          localStorage.setItem(`rc_account_device_backup_${meta.userId}`, JSON.stringify(local));
          const nextSnapshot = remote?.snapshot || EMPTY_SNAPSHOT;
          restoreLocalReaderSnapshot(nextSnapshot);
          writeAccountSyncMeta({ userId, signature: readerSnapshotSignature(nextSnapshot), syncedAt: remote?.updatedAt || new Date().toISOString() });
          window.location.reload();
          return;
        }
        localSnapshotRef.current = local;
        remoteSnapshotRef.current = remote?.snapshot || null;

        if (!remote?.snapshot) {
          const signature = await saveAccountSnapshot(supabaseClient, userId, local);
          writeAccountSyncMeta({ userId, signature, syncedAt: new Date().toISOString() });
          setPhase("ready");
          return;
        }

        if (readerSnapshotSignature(local) === readerSnapshotSignature(remote.snapshot)) {
          writeAccountSyncMeta({ userId, signature: readerSnapshotSignature(remote.snapshot), syncedAt: remote.updatedAt || new Date().toISOString() });
          setPhase("ready");
          return;
        }
        if (!localHasData) {
          restoreLocalReaderSnapshot(remote.snapshot);
          const remoteSignature = readerSnapshotSignature(remote.snapshot);
          writeAccountSyncMeta({ userId, signature: remoteSignature, syncedAt: remote.updatedAt || new Date().toISOString() });
          window.location.reload();
          return;
        }

        const decision = accountCopyDecision({ userId, meta, localSnapshot: local, remoteSnapshot: remote.snapshot });
        const remoteSignature = readerSnapshotSignature(remote.snapshot);
        if (decision === "cloud") {
          restoreLocalReaderSnapshot(remote.snapshot);
          writeAccountSyncMeta({ userId, signature: readerSnapshotSignature(remote.snapshot), syncedAt: remote.updatedAt || new Date().toISOString() });
          window.location.reload();
          return;
        }
        if (decision === "same") {
          writeAccountSyncMeta({ userId, signature: remoteSignature, syncedAt: remote.updatedAt || new Date().toISOString() });
          setPhase("ready");
          return;
        }
        if (decision === "device") {
          const signature = await saveAccountSnapshot(supabaseClient, userId, local);
          writeAccountSyncMeta({ userId, signature, syncedAt: new Date().toISOString() });
          setPhase("ready");
          return;
        }
        setPhase("choose-copy");
      } catch (prepareError) {
        if (cancelled) return;
        setError(prepareError?.message || "Could not load your cloud data.");
        setPhase("cloud-error");
      }
    };
    void prepare();
    return () => { cancelled = true; clearTimeout(syncTimerRef.current); };
  }, [sessionKnown, session?.user?.id]);

  const syncNow = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !supabaseClient) return false;
    if (syncInFlightRef.current) {
      queuedSyncRef.current = true;
      return false;
    }
    syncInFlightRef.current = true;
    setSyncStatus("syncing");
    try {
      const snapshot = collectLocalReaderSnapshot();
      const remote = await fetchAccountSnapshot(supabaseClient, userId);
      const meta = readAccountSyncMeta();
      const decision = accountCopyDecision({ userId, meta, localSnapshot: snapshot, remoteSnapshot: remote?.snapshot || null });
      if (decision === "cloud" && remote?.snapshot) {
        restoreLocalReaderSnapshot(remote.snapshot);
        writeAccountSyncMeta({ userId, signature: readerSnapshotSignature(remote.snapshot), syncedAt: remote.updatedAt || new Date().toISOString() });
        window.location.reload();
        return true;
      }
      if (decision === "conflict" && remote?.snapshot) {
        localSnapshotRef.current = snapshot;
        remoteSnapshotRef.current = remote.snapshot;
        setPhase("choose-copy");
        setSyncStatus("error");
        return false;
      }
      if (decision === "same" && remote?.snapshot) {
        writeAccountSyncMeta({ userId, signature: readerSnapshotSignature(remote.snapshot), syncedAt: remote.updatedAt || new Date().toISOString() });
        setSyncStatus("synced");
        return true;
      }
      const signature = await saveAccountSnapshot(supabaseClient, userId, snapshot);
      writeAccountSyncMeta({ userId, signature, syncedAt: new Date().toISOString() });
      setSyncStatus("synced");
      return true;
    } catch (syncError) {
      console.warn("[ACCOUNT] cloud sync failed:", String(syncError?.message || syncError).slice(0, 180));
      setSyncStatus("error");
      setError(syncError?.message || "Cloud sync failed. Your device copy is still available.");
      return false;
    } finally {
      syncInFlightRef.current = false;
      if (queuedSyncRef.current) {
        queuedSyncRef.current = false;
        void syncNow();
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (phase !== "ready" || !session?.user?.id) return undefined;
    const scheduleSync = () => {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => { void syncNow(); }, 1200);
    };
    const onOnline = () => { void syncNow(); };
    window.addEventListener("rc:local-data-changed", scheduleSync);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(syncTimerRef.current);
      window.removeEventListener("rc:local-data-changed", scheduleSync);
      window.removeEventListener("online", onOnline);
    };
  }, [phase, session?.user?.id, syncNow]);

  async function useCloudCopy() {
    if (!remoteSnapshotRef.current) return;
    setBusy(true);
    setError("");
    try {
      restoreLocalReaderSnapshot(remoteSnapshotRef.current);
      writeAccountSyncMeta({ userId: session.user.id, signature: readerSnapshotSignature(remoteSnapshotRef.current), syncedAt: new Date().toISOString() });
      window.location.reload();
    } catch (restoreError) {
      setError(restoreError?.message || "Could not restore the cloud copy.");
      setBusy(false);
    }
  }

  async function uploadDeviceCopy() {
    setBusy(true);
    setError("");
    try {
      const snapshot = localSnapshotRef.current || collectLocalReaderSnapshot();
      const signature = await saveAccountSnapshot(supabaseClient, session.user.id, snapshot);
      writeAccountSyncMeta({ userId: session.user.id, signature, syncedAt: new Date().toISOString() });
      setPhase("ready");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload this device's copy.");
    } finally { setBusy(false); }
  }

  async function signInWithGoogle() {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    const { error: signInError } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (signInError) {
      setError(signInError.message || "Google sign-in could not start.");
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabaseClient) return;
    setBusy(true);
    if (phase === "ready") {
      const synced = await syncNow();
      if (!synced) {
        setBusy(false);
        return;
      }
    }
    const { error: signOutError } = await supabaseClient.auth.signOut();
    if (signOutError) {
      setError(signOutError.message || "Could not sign out.");
      setBusy(false);
      return;
    }
    setBusy(false);
  }

  const deleteAccountData = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || !supabaseClient) throw new Error("You are not signed in to a cloud account.");
    const { error: deleteError } = await supabaseClient.from("reading_companion_accounts").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;
    localStorage.removeItem(ACCOUNT_SYNC_META_KEY);
  }, [session?.user?.id]);

  if (!sessionKnown || phase === "checking" || phase === "loading-data") {
    return <GateShell><div className="account-gate-loading"><span className="account-gate-spinner" /><b>{phase === "loading-data" ? "Loading your reader data" : "Checking your account"}</b></div></GateShell>;
  }

  if (phase === "cloud-error") {
    return (
      <GateShell>
        <div className="account-gate-mark"><Cloud size={28} /></div>
        <div className="account-gate-eyebrow">CLOUD DATA</div>
        <h1>Couldn’t load your account</h1>
        <p className="account-gate-lead">Your device copy has not been changed. Check your connection and retry.</p>
        {error && <p className="account-gate-error">{error}</p>}
        <div className="account-gate-choices">
          <button type="button" disabled={busy} onClick={() => window.location.reload()}><RefreshCw size={16} /> Retry</button>
          <button type="button" disabled={busy} onClick={signOut}><LogOut size={16} /> Sign out</button>
        </div>
      </GateShell>
    );
  }

  if (phase === "signed-out" || phase === "unconfigured") {
    const unconfigured = phase === "unconfigured";
    return (
      <GateShell>
        <div className="account-gate-mark"><BookOpenMark /></div>
        <div className="account-gate-eyebrow">YOUR READING, YOUR ACCOUNT</div>
        <h1>{unconfigured ? "Cloud sign-in needs setup" : "Keep your reading close"}</h1>
        <p className="account-gate-lead">Sign in to back up your books, saved ideas, words and reading memories across devices.</p>
        <div className="account-gate-benefits">
          <span><ShieldCheck size={15} /> Private to your account</span>
          <span><Cloud size={15} /> Syncs after saved changes</span>
          <span><HardDrive size={15} /> This device stays cached</span>
        </div>
        {error && <p className="account-gate-error">{error}</p>}
        {unconfigured
          ? <p className="account-gate-setup">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then configure Google under Supabase Auth providers.</p>
          : <button className="account-gate-google" type="button" disabled={busy} onClick={signInWithGoogle}><span className="account-google-mark">G</span>{busy ? "Opening Google…" : "Continue with Google"}</button>}
        <p className="account-gate-foot">Your data is stored in your private Reading Companion account, not in Google Drive.</p>
      </GateShell>
    );
  }

  if (phase === "choose-copy") {
    return (
      <GateShell>
        <div className="account-gate-mark"><Cloud size={28} /></div>
        <div className="account-gate-eyebrow">TWO COPIES FOUND</div>
        <h1>Which copy should we keep?</h1>
        <p className="account-gate-lead">This device and your account have different saved data. Choose one copy; neither will be changed until you choose.</p>
        {error && <p className="account-gate-error">{error}</p>}
        <div className="account-gate-choices">
          <button type="button" disabled={busy} onClick={useCloudCopy}><Download size={16} /> Use account copy</button>
          <button type="button" disabled={busy} onClick={uploadDeviceCopy}><HardDrive size={16} /> Keep this device's copy</button>
        </div>
        <p className="account-gate-foot">Signed in as {session.user.email || "your Google account"}.</p>
      </GateShell>
    );
  }

  if (phase !== "ready") return <GateShell><p className="account-gate-error">{error || "Account setup could not finish."}</p><button className="account-gate-google" onClick={() => void supabaseClient?.auth.signOut()}>Sign out</button></GateShell>;

  return <AccountContext.Provider value={{ user: session.user, syncStatus, syncNow, signOut, deleteAccountData }}>{children}</AccountContext.Provider>;
}

function GateShell({ children }) {
  return (
    <main className="account-gate-root">
      <div className="account-gate-grid" aria-hidden="true" />
      <section className="account-gate-panel">{children}</section>
      <span className="account-gate-footer">READING COMPANION · PRIVATE BY DESIGN</span>
    </main>
  );
}

function BookOpenMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 8.5c-3.5-2.5-8-2.6-11.5-.8v16c3.5-1.8 8-1.7 11.5.8m0-16c3.5-2.5 8-2.6 11.5-.8v16c-3.5-1.8-8-1.7-11.5.8m0-16v16.8" /></svg>;
}

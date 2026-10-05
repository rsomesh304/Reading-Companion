import { ChevronRight, History, MessageSquare, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { groupHelpSessions, sessionDate, sessionTitle } from "./helpHistory.js";

export default function HelpChatHistory({ sessions, selectedId, onSelect, onDelete, onClear, onClose }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const [deletion, setDeletion] = useState(null);
  const groups = groupHelpSessions(sessions, query);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function confirmDelete() {
    if (deletion.id) onDelete(deletion.id);
    else onClear();
    setDeletion(null);
  }

  return (
    <dialog ref={dialogRef} className="help-history-dialog" aria-labelledby="help-history-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="help-history-content">
        <header className="help-history-heading">
          <span className="help-history-heading-icon" aria-hidden="true"><History size={22} /></span>
          <div><h2 id="help-history-title">Chat history</h2><p>Your previous help conversations</p></div>
          <button className="help-round-button" type="button" onClick={onClose} aria-label="Close chat history"><X size={19} /></button>
        </header>
        <label className="help-history-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
        </label>
        <div className="help-history-list">
          {groups.length ? groups.map((group) => (
            <section className="help-history-group" key={group.label} aria-label={group.label}>
              <h3>{group.label}</h3>
              {group.sessions.map((session) => (
                <div className={`help-history-row ${selectedId === session.id ? "selected" : ""}`} key={session.id}>
                  <button className="help-history-select" type="button" onClick={() => onSelect(session.id)} aria-current={selectedId === session.id ? "true" : undefined}>
                    <MessageSquare size={18} aria-hidden="true" />
                    <span><b>{sessionTitle(session)}</b><small>{sessionDate(session)}{selectedId === session.id ? " · Viewing" : ""}</small></span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="help-history-delete" onClick={() => setDeletion({ id: session.id, title: sessionTitle(session) })} aria-label={`Delete chat: ${sessionTitle(session)}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </section>
          )) : (
            <div className="help-history-empty" role="status">
              {sessions.length ? <Search size={28} aria-hidden="true" /> : <MessageSquare size={28} aria-hidden="true" />}
              <h3>{sessions.length ? "No matching conversations" : "No previous conversations"}</h3>
              <p>{sessions.length ? "Try a different word or clear your search." : "Your help chats will appear here after you start a new conversation."}</p>
              {query && <button type="button" className="help-toolbar-button" onClick={() => setQuery("")}>Clear search</button>}
            </div>
          )}
        </div>
        {deletion && (
          <div className="help-history-confirm" role="alert">
            <b>{deletion.id ? "Delete this conversation?" : "Delete all previous conversations?"}</b>
            <p>{deletion.id ? deletion.title : "Your current chat will be kept."} This cannot be undone.</p>
            <div><button type="button" className="help-toolbar-button" onClick={() => setDeletion(null)}>Cancel</button><button type="button" className="help-toolbar-button help-danger-button" onClick={confirmDelete}>Delete{deletion.id ? " chat" : " all"}</button></div>
          </div>
        )}
        <footer className="help-history-footer">
          <p>Stored on this device only. Not backed up.</p>
          {sessions.length > 0 && <button type="button" className="help-history-clear" onClick={() => setDeletion({ id: null })}><Trash2 size={14} />Clear history</button>}
        </footer>
      </div>
    </dialog>
  );
}

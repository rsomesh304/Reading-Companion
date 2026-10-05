import assert from "node:assert/strict";
import test from "node:test";
import { groupHelpSessions, sessionDate, sessionTitle } from "./helpHistory.js";

const session = (id, date, content = id) => ({
  id, updatedAt: date.toISOString(), messages: [{ role: "user", content }],
});
const now = new Date(2026, 9, 5, 12);

test("groups conversations by local calendar day, newest first, without mutating history", () => {
  const sessions = [
    session("older", new Date(2026, 8, 27)),
    session("early", new Date(2026, 9, 5, 1)),
    session("yesterday", new Date(2026, 9, 4, 23, 59)),
    session("week", new Date(2026, 8, 28)),
    session("recent", new Date(2026, 9, 5, 11)),
  ];
  const original = [...sessions];
  const groups = groupHelpSessions(sessions, "", now);
  assert.deepEqual(groups.map(({ label }) => label), ["Today", "Yesterday", "Previous 7 days", "Older"]);
  assert.deepEqual(groups[0].sessions.map(({ id }) => id), ["recent", "early"]);
  assert.deepEqual(sessions, original);
});

test("searches all message contents ignoring case and surrounding whitespace", () => {
  const chat = session("book", now, "How do I add a book?");
  chat.messages.push({ role: "assistant", content: "Open your Library." });
  assert.equal(groupHelpSessions([chat], " LIBRARY ", now)[0].sessions[0].id, "book");
  assert.deepEqual(groupHelpSessions([chat], "ghost", now), []);
  assert.deepEqual(groupHelpSessions([], "", now), []);
});

test("formats legacy conversations with missing dates and bounded titles", () => {
  const chat = { id: "legacy", updatedAt: "invalid", messages: [{ role: "assistant", content: "Welcome" }] };
  assert.equal(sessionTitle(chat), "Welcome");
  assert.equal(sessionDate(chat), "");
  assert.equal(groupHelpSessions([chat], "", now)[0].label, "Older");
  assert.equal(sessionTitle({ messages: [] }), "Chat");
  assert.equal(sessionTitle(session("long", now, "a".repeat(70))), `${"a".repeat(56)}…`);
});

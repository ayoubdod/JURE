# Frontend prompt – Message delivery & read check marks

**Copy and paste this prompt into Cursor (frontend project) to implement the single/double check UI for sent messages.**

---

## Copy-paste prompt

```
Implement message delivery and read receipt check marks (WhatsApp-style) for the chat.

══════════════════════════════════════════════════════════════════
1. BEHAVIOR
══════════════════════════════════════════════════════════════════
Show check marks only on the SENDER's own messages (when message.is_own is true).

Three states (from sender's perspective):
- ✓ One grey check: Message was SENT (not yet received by recipient)
- ✓✓ Two grey checks: Message was DELIVERED (recipient received it)
- ✓✓ Two blue checks: Message was READ (recipient opened and read it)

══════════════════════════════════════════════════════════════════
2. API FIELDS
══════════════════════════════════════════════════════════════════
Each message from REST or WebSocket includes:
- delivered_count (number): How many recipients have received the message
- read_count (number): How many recipients have read the message

══════════════════════════════════════════════════════════════════
3. FRONTEND LOGIC
══════════════════════════════════════════════════════════════════
Only render check marks when message.is_own === true.

if (delivered_count === 0 && read_count === 0) {
  // Sent only
  show: ✓ (single check, grey)
} else if (read_count === 0) {
  // Delivered (received) but not read
  show: ✓✓ (double check, grey)
} else {
  // Read
  show: ✓✓ (double check, blue)
}

══════════════════════════════════════════════════════════════════
4. UI IMPLEMENTATION
══════════════════════════════════════════════════════════════════
- Place the check icon(s) at the bottom-right of the message bubble (for own messages).
- Use SVG icons or Unicode: ✓ (U+2713) or similar.
- Single check: one icon, color grey (e.g. #9ca3af or similar)
- Double check (delivered): two icons side by side, grey
- Double check (read): two icons side by side, blue (e.g. #3b82f6 or primary blue)

Example Tailwind classes:
- Grey: text-gray-400 or text-gray-500
- Blue: text-blue-500

══════════════════════════════════════════════════════════════════
5. REAL-TIME UPDATES
══════════════════════════════════════════════════════════════════
When recipient receives the message (e.g. opens conversation, fetches messages), backend increments delivered_count and broadcasts message.updated.

When recipient reads (calls mark_read when opening the conversation), backend increments read_count and broadcasts message.updated.

You MUST handle "message.updated" from WebSocket:
- Payload contains full message object with updated delivered_count and read_count
- Find the message by id in your local state and REPLACE it with the payload
- The check marks will re-render with the new values

Without this, the sender will never see grey/blue checks update in real time.

══════════════════════════════════════════════════════════════════
6. GROUP CHAT
══════════════════════════════════════════════════════════════════
In group chats, delivered_count and read_count can be > 1 (multiple recipients).
Same logic: 
- delivered_count === 0 → ✓ sent
- delivered_count > 0 && read_count === 0 → ✓✓ grey (at least one received)
- read_count > 0 → ✓✓ blue (at least one read)
```

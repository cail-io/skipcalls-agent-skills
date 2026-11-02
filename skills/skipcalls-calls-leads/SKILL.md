---
name: skipcalls-calls-leads
description: Review and act on what a SkipCalls AI receptionist handled - calls, transcripts, recordings, leads, contacts, Needs you follow-ups, reminders and appointments. Use when the user asks who called, what a caller wanted, how the receptionist is doing, what needs follow-up, to update a contact, or to find, book or cancel an appointment.
allowed-tools: getOverview loadSkill listAgents statusReport getCallHistory getCallDetails app_listCalls app_getCall openCallsInbox search search_mentions reportCallIssue get_contact get_contact_timeline list_customer_files addToContacts update_contact create_contact_note create_upload_link list_work get_work update_work create_reminder cancel_reminder calendar_list calendar_list_events findCalendarSlots bookCalendarSlot findAppointments cancelAppointment
---

# SkipCalls: calls, leads and follow-ups

Use the SkipCalls MCP server (`https://be.skipcalls.com/mcp`). If it is not
connected yet, use the `skipcalls` skill first. `allowed-tools` lists SkipCalls
MCP tool names; your client may prefix them with the server name. To text a
customer or place a call, use the `skipcalls-messaging` skill.

## Start every task the same way

1. `getOverview` once per session (operator manual; read silently).
2. `listAgents` to know which account and receptionists you are reading. When
   the user means one business or line, scope your answer to it.
3. Then read the narrowest data that answers the question.

## Behavior rules

1. Never guess IDs. Take call, contact, work item, appointment and calendar
   IDs from a list or search result and copy them exactly.
   `getCallDetails` detects inbound vs outbound from the ID; do not classify it
   yourself.
2. Get the account first (step 2 above). Never mix data from different
   receptionists without saying so.
3. Confirm right before every write (contact changes, notes, upload links,
   bookings, cancellations, reminders, call issue reports): show the exact
   change and wait for a clear yes.
4. Accepted is not delivered. After a write, read it back (`get_contact`,
   `findAppointments`, `get_work`) before you say it happened.
5. Recordings are links. `getCallDetails` returns the recording URL and a
   share link to the call page; give those links. Do not download, transcribe
   again, re-host or paste audio. Quote the returned transcript when the user
   needs exact words.
6. Never invent caller names, numbers, or what someone said. If the transcript
   does not say it, say that.
7. Talk in product terms (receptionist, call, contact), not field names.

## Which tool answers which question

- "How is my receptionist doing?", "how many leads last month?":
  `statusReport` (period reports take `from` / `to` as YYYY-MM-DD).
- "Who called today?": `getCallHistory` with `type` and the smallest useful
  `count`; `sinceHours` is a hard time window.
- "Did <person> call?", "the call about the roof leak": `search` (scope calls,
  contacts or SMS), then `getCallDetails` with the returned ID.
- One call in full: `getCallDetails` (summary, transcript, recording link,
  duration, share link). `openCallsInbox`, `app_listCalls` and `app_getCall`
  render the interactive inbox in clients that support MCP apps.
- What callers want across many calls, missed demand:
  `loadSkill({skillName: "call-insights"})` first, then sample calls.
- A call that went wrong: `loadSkill({skillName: "call-improvement"})`, read
  the call, propose one concrete fix (applied with the `skipcalls-receptionist`
  skill). `reportCallIssue` records the problem only after `getCallDetails`
  shows concrete evidence and the user agrees; keep it free of personal data.

## Contacts

`loadSkill({skillName: "contact-management"})` for multi-step contact work.
`get_contact` and `get_contact_timeline` read a contact; `list_customer_files`
lists their uploads. `addToContacts` is an upsert by phone number and
overwrites the name of an existing contact, so search first. `update_contact`
changes fields, including Skip AI on/off (`bypassReceptionist`).
`create_contact_note` adds a note; `create_upload_link` makes a public link the
customer can use to send files (share it only with that customer).

## Needs you (follow-ups and reminders)

`loadSkill({skillName: "work-inbox"})` first. `list_work` (views needs_you,
snoozed, waiting, done) and `get_work` show who is waiting and the prepared
reply. Nothing there sends by itself: to act, hand off to the
`skipcalls-messaging` skill, then ask the user and mark it with `update_work`
(done, not_needed, later, due time). `create_reminder` / `cancel_reminder` for
"remind me".

## Appointments

`loadSkill({skillName: "calendar-management"})` for booking work.
`calendar_list` gives calendar short IDs; `calendar_list_events` shows a day.
`findCalendarSlots` returns real free slots; `bookCalendarSlot` books one exact
returned slot after the user approves calendar, time, title and guest details.
`findAppointments` finds booked ones; `cancelAppointment` cancels one exact
appointment at the calendar provider after explicit approval (it reaches the
guest's real calendar).

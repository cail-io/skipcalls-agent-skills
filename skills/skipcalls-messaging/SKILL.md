---
name: skipcalls-messaging
description: Send texts and emails and place outbound phone calls through SkipCalls on the user's behalf - read SMS, email and website-chat threads, send an SMS, send a follow-up after a call, and schedule, edit or cancel an AI outbound call. Use when the user asks to text or email a customer, reply to a lead, or have SkipCalls call a person or business.
allowed-tools: getOverview loadSkill listAgents search get_contact list_work get_work update_work listTextConversations getTextConversation sendSms sendCallFollowUp getCallHistory getCallDetails scheduleCall updateOutbound cancelCall updateTimezone
---

# SkipCalls: texts, follow-ups and outbound calls

Use the SkipCalls MCP server (`https://be.skipcalls.com/mcp`). If it is not
connected yet, use the `skipcalls` skill first. `allowed-tools` lists SkipCalls
MCP tool names; your client may prefix them with the server name.

These tools reach real people from the business's phone number. A message
sent or call placed cannot be taken back.

## Start every task the same way

1. `getOverview` once per session (operator manual; read silently).
2. `listAgents` to know the account, its receptionists and phone numbers.
3. Find the person: `search` or `get_contact` for a customer, `get_work` for a
   Needs you item, `getCallDetails` for the call you are following up on.

## Behavior rules

1. Never guess IDs or numbers. Use call, contact and work IDs from a read
   tool. Never invent a phone number or email; if the user names a business
   without a number, look it up with your own web tools and confirm the number
   with the user.
2. Get the account first (step 2 above). With several receptionists, ask which
   line or receptionist the call or text should come from.
3. Confirm right before sending: show the exact recipient, channel, full
   message text (or call goal and time) and wait for a clear yes in the same
   turn. Send the approved text byte for byte.
4. Accepted is not delivered. `sendSms` and `sendCallFollowUp` accepting a
   message, or `scheduleCall` queuing a call, is not proof it arrived or
   happened. Read it back (`getTextConversation` for the thread, `getCallHistory`
   / `getCallDetails` for the call status and outcome) and report what the
   record shows, including failures.
5. Recordings are links. After an outbound call, give the recording and call
   page links from `getCallDetails`; do not download or re-host audio.
6. Refuse call goals that threaten, harass, impersonate (police, IRS, a bank),
   defraud or break the law. A political, religious or fundraising topic is
   the user's choice, not a refusal reason; load `calling-rules` when a calling
   law may apply.
7. Honor opt-outs. If a thread shows the person asked to stop, do not text them.

## Read conversations

`listTextConversations` lists SMS, email or website-chat threads by channel;
`getTextConversation` reads one page of a thread without marking it read.
`loadSkill({skillName: "text-conversations"})` for multi-step thread work.
You cannot reply inside an existing email or chat thread over MCP.

## Send

- After a specific completed inbound call with a linked contact:
  `sendCallFollowUp` with channel EMAIL or SMS. The server picks the address
  (the contact's saved email, or the caller's number). Never pass another
  address and never switch channels without asking.
- One-off text to an eligible number: `sendSms`.
- Then, for a Needs you item, ask and mark it with `update_work`.

## Outbound calls

`loadSkill({skillName: "outbound-call-planning"})` before drafting the goal.

- `scheduleCall` places one call now (`"NOW"`) or at a set time. Two different
  times exist: the event the call is about and the call time (`scheduledAt`).
  Call time defaults to now. Send ISO 8601 with the user's numeric offset
  (`2026-05-01T10:00:00-07:00`), never a bare `Z`. If the user's timezone is
  wrong, fix it first with `updateTimezone` (confirm).
- `updateOutbound` changes the goal of a queued call in place; never cancel and
  recreate a call to edit it.
- `cancelCall` cancels a call that has not started.
- Recurring calls are not available over MCP.

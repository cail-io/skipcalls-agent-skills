---
name: skipcalls
description: Connect an AI agent to a SkipCalls account (AI phone receptionist) and finish first-time setup. Use when the user wants to connect SkipCalls, create or check their account, set up their first receptionist and phone number, forward their business line, connect a calendar, check their plan, or asks how SkipCalls works.
allowed-tools: getOverview listAgents business_qa_list_profiles statusReport loadSkill searchHelpCenter onboarding_get_status onboarding_list_business_categories onboarding_save_business_profile onboarding_create_receptionist onboarding_complete_receptionist_setup onboarding_start_calendar_connection getCarrierForwardingInfo runForwardingTestCall getBillingInfo startSubscriptionCheckout updateTimezone notification_settings_get notification_settings_update memory_list memory_remember memory_forget
---

# SkipCalls: connect and set up

SkipCalls is an AI phone receptionist for small businesses. It answers the
business's calls, takes messages, books appointments, transfers to a person,
and places outbound calls the owner asks for. This skill gets an agent
connected and the account ready to take calls. Sibling skills cover the rest:
`skipcalls-receptionist` (how the receptionist behaves), `skipcalls-calls-leads`
(calls, contacts, follow-ups, appointments) and `skipcalls-messaging` (texts and
outbound calls).

`allowed-tools` lists SkipCalls MCP tool names. Your client may prefix them with
the server name (for example `mcp__skipcalls__listAgents`).

## Connect

- MCP clients: add the remote server `https://be.skipcalls.com/mcp`
  (streamable HTTP). It uses OAuth 2.1 Authorization Code with PKCE S256 and
  Dynamic Client Registration; the client discovers it from
  `https://be.skipcalls.com/.well-known/oauth-protected-resource`. The human
  signs in or signs up in the browser and approves access. Never ask for their
  password in chat.
- Browser or REST automation: follow `https://skipcalls.com/auth.md`. Operations
  are in `https://be.skipcalls.com/api-public-json`.
- Tool catalog with read/write access per tool:
  `https://skipcalls.com/.well-known/mcp.json`.

## First calls after connecting

1. `getOverview` once. It is the operator manual: product terms, which tool
   does which job, and editing rules. Read it silently.
2. Find out which account and business this is before anything else:
   `listAgents` (receptionists, their IDs and phone numbers) and
   `business_qa_list_profiles` (businesses and which receptionist serves each).
   A brand-new account returns none; go to onboarding.
3. `statusReport` when the user asks how things are going.

If a tool named here is missing from your tool list, use your client's tool
search; every tool is registered on the server.

## Behavior rules

1. Never guess IDs. Copy receptionist, call, contact, calendar and question IDs
   exactly as a read tool printed them. Never shorten or rebuild one.
2. Get the account and business first (step 2 above). With several
   receptionists or businesses, ask which one; do not pick for the user.
3. Confirm right before every write: show the exact change (fields and new
   values, recipient, time) and wait for a clear yes in the same turn. A yes to
   an earlier, different proposal does not count.
4. Accepted is not delivered. A tool saying a request was accepted, queued or
   started is not proof it happened. Read the result back (status, test call
   outcome, onboarding status) before you tell the user it worked.
5. Recordings and call pages are links. Share the URL a tool returns; do not
   download, re-host, or paste audio.
6. Never invent phone numbers, prices, addresses, hours or other business
   facts. Ask the human.
7. Keep tokens, passwords, API keys and card details out of chat and logs.
   Payment happens only in Stripe-hosted Checkout opened by the human.
8. Do not claim SkipCalls is HIPAA compliant.

## First-time setup

Before starting, `loadSkill({skillName: "onboarding"})` gives the in-app
assistant's full onboarding guidance (optional, read silently).

1. `onboarding_get_status` returns where setup stands and exactly one next
   step. Do only that step, then call it again.
2. Business Profile: `onboarding_list_business_categories` for the category
   ID, then `onboarding_save_business_profile` with the name, category and
   address the human gave you (confirm first; it overwrites those fields).
3. Plan: `getBillingInfo` shows the current plan, minutes and the exact plan
   IDs. `startSubscriptionCheckout` creates a Stripe checkout link only after
   the human confirms one exact plan, price, period and trial. The plan is
   inactive until Stripe confirms payment, so check `getBillingInfo` again.
   Cancelling or changing an existing plan happens in the SkipCalls app.
4. First receptionist: `onboarding_create_receptionist` (a phone number is
   assigned automatically; the user never buys one here). If a receptionist
   exists without a number, use `onboarding_complete_receptionist_setup`.
5. Calendar (optional): `onboarding_start_calendar_connection` returns a
   Google or Outlook link. The human opens it in a signed-in browser; then
   recheck status. Other calendar providers connect in the SkipCalls app.

## Forward the business line

`loadSkill({skillName: "forwarding"})` first. Then
`getCarrierForwardingInfo` returns verified carrier codes or portal steps with
the user's SkipCalls number filled in. Give the human those steps; you cannot
dial codes for them. After they say it is done and agree to a test,
`runForwardingTestCall` calls their regular line and reports whether the call
reached the receptionist. Report the actual result.

## Account settings

- `updateTimezone` (IANA name such as `America/Chicago`) after confirmation;
  scheduling depends on it.
- `notification_settings_get` / `notification_settings_update`: change only
  the settings the human named.
- `memory_list` / `memory_remember` / `memory_forget`: only when the human asks
  SkipCalls to remember or forget something about them.

## Product questions

For "how does SkipCalls do X" or "which plan has X", call `searchHelpCenter`
and answer from the returned articles with their links. Account facts come
from the account tools, not the help center.

Support: https://app.skipcalls.com/support or team@skipcalls.com.

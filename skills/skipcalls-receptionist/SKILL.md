---
name: skipcalls-receptionist
description: Change how a SkipCalls AI receptionist handles calls - greetings, call instructions, voice, Business Profile answers, Knowledge Base pages, call scenarios, call tasks, transfer numbers, Lead Alerts, calendar booking settings, estimate prices and Agent Functions. Use when the user wants their receptionist to say, ask, know, book, transfer or alert something differently.
allowed-tools: getOverview loadSkill searchHelpCenter listAgents getAgent updateAgent getAvailableVoices business_qa_list_profiles business_qa_list business_qa_create business_qa_update business_qa_delete knowledge_list_pages knowledge_get_page knowledge_create_page knowledge_update_page listCallScenarios call_scenarios_create call_scenarios_update call_scenarios_delete call_scenarios_reorder agent_tasks_list agent_tasks_add agent_tasks_delete transfer_numbers_list transfer_numbers_add transfer_numbers_update transfer_numbers_delete transfer_numbers_reorder lead_alerts_get lead_alerts_replace calendar_list calendar_update_settings estimates_get estimates_try estimates_update_prices estimates_undo estimates_set_enabled estimates_set_quote_on_calls estimates_confirm_assumption estimates_start_over agent_functions_list agent_functions_get_guide agent_functions_get_code agent_functions_run_tests agent_functions_create_http agent_functions_create_code agent_functions_update_code agent_functions_attach
---

# SkipCalls: configure the receptionist

Use the SkipCalls MCP server (`https://be.skipcalls.com/mcp`). If it is not
connected yet, use the `skipcalls` skill first. `allowed-tools` lists SkipCalls
MCP tool names; your client may prefix them with the server name.

Every change here alters what real callers hear on a live phone line. Treat
each write as production.

## Start every task the same way

1. `getOverview` once per session (operator manual; read silently).
2. `listAgents` for the receptionists and their IDs. With more than one, ask
   which receptionist; with several businesses, `business_qa_list_profiles`
   shows which receptionist serves which business.
3. `getAgent` for the current configuration before proposing anything.
4. Load the matching expert workflow with `loadSkill` before drafting, and read
   it silently:
   - greetings, call instructions, whole call flow: `receptionist-setup`
     (`full-duplex-prompting` when `getAgent` says the receptionist is GPT-Live)
   - one situation with its own steps: `call-scenario-management`
   - facts like hours, prices, service area: `business-profile`
   - who gets called or texted about which leads: `lead-alert-management`
   - estimate prices: `estimates`
   - booking settings: `calendar-management`
   - Code functions: `code-function-authoring`

## Behavior rules

1. Never guess IDs. Copy agent, question, page, scenario, task, transfer and
   calendar IDs exactly as a read tool printed them (4-character short IDs
   included).
2. Get the account and business first (steps 2-3 above). Do not edit a
   receptionist you have not read in this session.
3. Confirm right before every write: show the exact before and after text or
   values and wait for a clear yes. Preserve the user's own wording byte for
   byte; never shorten, translate or "improve" text they dictated.
4. Send only the fields that change. `updateAgent` with a whole config can
   overwrite settings the user did not mention.
5. Accepted is not delivered. After a write, read it back (`getAgent`,
   `business_qa_list`, `knowledge_get_page`, `listCallScenarios`,
   `transfer_numbers_list`, `lead_alerts_get`, `estimates_get`) and confirm the
   saved value matches before you say it is done.
6. Recordings and previews are links. Share URLs the tools return; never
   download or re-host audio.
7. Never invent business facts (prices, hours, addresses, policies, phone
   numbers). Ask the human. Do not fill the Business Profile from web search.
8. Do not pad instructions with generic assistant rules ("be polite", "speak
   clearly"). SkipCalls already handles tone, safety and turn-taking; add only
   business specifics.

## Where each fact goes

- Short caller-facing facts (hours, prices, service area, policies):
  Business Profile Q&A, `business_qa_*`.
- Longer reference text the receptionist can cite: Knowledge Base pages,
  `knowledge_*` (read the page first and keep its ID and updated timestamp for
  `knowledge_update_page`). File uploads and page deletion happen in the app.
- How a whole call goes, greetings, voice: `updateAgent`
  (`incomingCallInstructions` for inbound, `instructions` for outbound,
  `welcomingVoiceMailMessageForContacts` / `welcomingVoiceMailMessageForOthers`
  for greetings). Pick voices from `getAvailableVoices` by exact ID.
- A specific situation with its own steps (emergency, quote request):
  Call Scenarios, `call_scenarios_*`, under 6,000 characters each, PRO plan or
  higher.
- Something to collect or do on every call: call tasks, `agent_tasks_*`; at
  most one add per user message, at most 3 custom tasks per account.
- Handing a live call to a person: `transfer_numbers_*` (E.164 numbers,
  `transfer_numbers_reorder` must list every short ID; pause with
  `isActive=false` instead of deleting).
- Calling or texting a team member after certain calls: Lead Alerts.
  `lead_alerts_replace` replaces the complete rule list, so read with
  `lead_alerts_get`, edit, and confirm the full final list. Never put alert
  rules in call instructions.
- Booking hours, appointment length, buffers: `calendar_update_settings` on a
  `calendar_list` short ID. Square, Calendly, TidyCal, Cal.com and GHL keep
  those settings in their own apps; relay the rejection instead of retrying.
- Price estimates (PRO and above, owner or admin): `estimates_get` first,
  `estimates_try` to preview what a caller would hear, then
  `estimates_update_prices` with the owner's exact words. `estimates_start_over`
  cannot be undone.

## Greeting variables

Known-caller greetings may use only `{{contact_name}}`, `{{contact_first}}`,
`{{contact_last}}`, `{{contact_company}}`, `{{contact_email}}`,
`{{contact_phone}}`, `{{contact_address}}`. Unknown-caller greetings use no
variables.

## Agent Functions

`agent_functions_get_guide` before drafting Code. Before any create, show the
type, name, endpoint (HTTP), behavior and test summary, and get a yes. Never
repeat secret header values. Creating a function does not attach it; attach
with `agent_functions_attach` (or pass `agentId` on create) after confirming
the receptionist. Code saves only when all its tests pass; report failures as
they are. Connecting an outside MCP server is done in the app.

## Questions about features

`searchHelpCenter` answers "how does X work" or "which plan has X" with
article links.

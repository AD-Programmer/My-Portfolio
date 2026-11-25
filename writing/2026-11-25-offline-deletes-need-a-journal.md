---
title: A deleted row can't tell the server it was deleted
date: 2026-11-25
description: Why offline sync in SmartSite records an ordered journal of intents instead of flagging dirty rows, and how keys made on the device make a retried sync harmless.
tags: offline-first, sync, Xamarin.Forms
---

Most offline sync starts with the same idea. Give every row a `dirty` flag, set it on edit, and when the phone gets signal, send every dirty row to the server. It's simple, and it holds up right until someone deletes something.

SmartSite is the app Siemens Gamesa's subcontractor crews use to report labour on wind farm construction sites. A crew can create, edit and delete timesheets with no signal at all. Activities hold tasks, tasks hold timeframes, and all of it is editable offline. And timesheets are money: a lost one is a payment dispute, and so is a duplicated one.

## The delete problem

A dirty flag lives on the row. When the user deletes the row, the flag goes with it. The next sync has nothing to send, and the server still has the timesheet the crew removed.

The usual patches are a soft delete (keep the row, mark it deleted, hide it everywhere) or a separate table of deleted IDs. Both hold up until the model is nested. Delete an activity offline and you've also deleted its tasks and their timeframes, and some of those were created offline and never reached the server. Now the sync code has to work out which deletions to send, which to skip because the server never heard of them, and in what order.

## Record what the user did, not what the row looks like

What SmartSite does instead is keep an ordered journal of intents. Every save is a local transactional commit that records the change and a journal entry saying *create*, *edit* or *delete*, for which record, in what order.

- A delete becomes an intent with a tombstone. There's no row left, but there is a record of what happened to it.
- Sync drains the journal in order. A child created under a parent goes after the parent, because that's the order it happened in.
- The local database is the crew's system of record. A save returns immediately, and the network is a downstream consumer of the journal.

## Keys made on the device

The other half is that every record gets a stable key generated on the phone when it's created, rather than an ID handed out by the server.

That solves two problems. A child created offline under a parent that was also created offline can point at its parent before either one has a server identity. And the server can be idempotent on that key: if a batch goes out, the connection drops before the response comes back, and the app retries, the replay is a no-op.

That difference matters more than it sounds. Careful retry logic tries to avoid duplicates. Idempotency on a client key makes them impossible by construction, which is a much easier thing to defend in a design review.

## Make "pending" visible

One deliberate, slightly contrarian choice: sync in SmartSite is explicit. The app shows a pending count, and the crew presses sync when they have signal. When the data is someone's pay, being able to see what isn't safe yet builds more trust than a silent background process.

Partial success is fine under this model. If sync drops halfway, the intents that didn't make it are still in the journal, and the next sync picks them up.

## Test it like you don't trust it

"It works offline" is a claim, and a claim needs a test suite behind it. The sync layer was driven through a fake connectivity provider that could simulate clean drops, flapping cells, slow and lossy links and disconnects mid-request. A separate test kills the process during a write transaction.

## If you're about to build this

1. Don't flag rows. Journal intents, in order, as part of the same local commit as the write.
2. Generate keys on the device, and make the server idempotent on them.
3. Run the same validation offline as online, so nothing gets rejected days later at sync, when nobody remembers the detail.
4. Write the network-fault tests before you trust any of it.

The full architecture, with the diagram, is in the [SmartSite case study](/case-smartsite).

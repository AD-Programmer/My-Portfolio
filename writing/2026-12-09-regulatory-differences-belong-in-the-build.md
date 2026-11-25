---
title: Regulatory differences belong in the build, not behind a flag
date: 2026-12-09
draft: true
description: Hilti's Firestop Selector ships UL, ETA and DIN variants from one .NET MAUI codebase. Why each region is resolved at build time, and what that made possible.
tags: .NET MAUI, architecture, compliance
---

Hilti's Firestop Selector helps contractors choose the right firestop solution, and the result is used to justify a compliance decision. It ships in three regulatory variants, UL, ETA and DIN. Each one has its own approvals corpus, its own selection logic, and features that ship on their own schedule. All three come from one .NET MAUI codebase.

There are two common ways to build that. We used neither.

## Option one: a branch per region

Three branches is the easy start. Then every fix has to be merged three times and regression-tested three times, and the branches slowly stop agreeing about what the app is. Give it long enough and you have three products that share a name.

## Option two: one build with runtime flags

One build with a region setting avoids the drift. But now every installed app carries every region's rules, every corpus schema and every UI branch. And its failure mode is the one compliance software can't afford: a misconfigured flag shows a German approval to a US contractor. Nothing crashes. Someone just makes a decision based on the wrong document.

## What we did: resolve the region at build time

The region is chosen when the app is built, not when it runs. Each variant is its own signed app with its own bundle identity, and the other regions' rules aren't in it, so they can't be shown by mistake. As a bonus, each installed app is smaller.

Two rules keep that from turning into a fork:

- **The domain layer never names a region.** Region behaviour sits behind a set of known interfaces, and each region registers its implementation. Adding a fourth market means implementing those interfaces, not hunting for every place that assumed there were three.
- **One pipeline builds every variant.** A single merge produces a signed build for each region. Internal QA rings get it through Firebase App Distribution, regional beta groups through TestFlight, and Crashlytics data decides when a rollout moves forward.

## The test: can a feature ship to one region only?

The proof that the variants were really independent is that a feature could ship to one region without touching the others. Material estimation, which lets a user estimate how much product a job needs, went live for the DIN region while the UL and ETA builds shipped unrelated work on their own cadence.

Global search went to all three, but with different entity sets per region, because the ETA model organises work in folders where UL surfaces engineering judgements. On a branch-per-region codebase that's three merges. On a flagged monolith it's three more code paths in every build. Here it was one feature, written against the region interfaces.

## The rule I'd take to any team

Cosmetic differences between customers are fine as configuration. Differences with legal consequences should be impossible to get wrong at runtime, so resolve them as early in the build as you can. If something can be misconfigured at runtime, sooner or later someone will misconfigure it.

The full architecture is in the [Hilti case study](/case-hilti).

# ArcTrail 3D — Product Requirements Document
## Full Sports Platform Redesign & Claude Implementation Specification

**Version:** 2.1  
**Date:** 20 August 2026  
**Status:** Implementation-ready  
**Product:** ArcTrail 3D  
**Website:** https://arctrail3d.com/  
**Primary implementation target:** Claude Code / Claude Sonnet  
**Purpose:** Single source of truth for redesigning ArcTrail 3D into a complete 3D archery sports platform.

---

# 0. Executive Summary

ArcTrail 3D already contains meaningful functionality: field discovery, scoring, federation rules, training sessions, clubs, field reporting, messaging, marketplace functionality, multilingual support and offline-oriented use cases.

The core problem is not lack of functionality.

The core problem is that the current product behaves and looks like a collection of utilities rather than one coherent sports platform.

The redesign must reposition ArcTrail 3D as:

> **The digital home of 3D archery.**

The product must support the user before, during and after the sporting activity.

The product loop is:

> **Discover → Shoot → Improve → Connect → Compete**

This PRD defines:

- product positioning;
- information architecture;
- navigation;
- complete page inventory;
- page-by-page UX;
- scoring architecture requirements;
- club and event systems;
- performance features;
- social/community features;
- profile and equipment features;
- design system;
- mobile behavior;
- data model guidance;
- security/privacy requirements;
- analytics;
- implementation phases;
- acceptance criteria;
- QA;
- exact execution instructions for Claude.

Claude must not treat this document as permission to blindly rebuild the codebase.

The first implementation step is always a technical audit.

---

# 1. Product Vision

ArcTrail should become the default digital companion for 3D archers.

The user should open ArcTrail:

### Before shooting
To discover a field, course, training or event.

### During shooting
To score a round quickly and reliably.

### Immediately after shooting
To see results, personal bests and performance insight.

### Between activities
To review progress, join trainings, interact with clubs and prepare for events.

### During a season
To build a record of improvement, equipment performance and competition participation.

The intended product experience is similar in strategic structure to:

- Strava;
- Garmin Connect;
- AllTrails;
- Nike Run Club;
- 18Birdies;
- GameChanger;
- TeamSnap.

ArcTrail should borrow the strongest product principles from those platforms, but never become a generic imitation.

The product must remain unmistakably built for 3D archery.

---

# 2. Product Positioning

## 2.1 Main value proposition

### Headline

**One app for 3D archery.**

### Supporting proposition

**Find fields. Shoot rounds. Track your progress. Meet other archers.**

## 2.2 Strategic identity

ArcTrail is not simply:

- a scorecard;
- a field finder;
- a club dashboard;
- a competition tool;
- a marketplace.

It is the connective infrastructure around the full 3D archery experience.

## 2.3 Product promise

ArcTrail must make these five things exceptionally easy:

1. **Find somewhere to shoot**
2. **Start and complete a round**
3. **Understand performance**
4. **Find people and clubs**
5. **Participate in events and competitions**

---

# 3. Product Principles

## 3.1 Mobile first

The product is frequently used:

- outdoors;
- in forests;
- in sunlight;
- with weak reception;
- while walking;
- with one hand;
- with cold, wet or dirty fingers.

Therefore:

- key touch targets should be at least 44×44px;
- scoring buttons should be larger than normal mobile buttons;
- live scoring should use very high contrast;
- critical actions must be reachable with one hand;
- the scoring flow must minimize typing;
- active rounds must survive temporary connectivity loss.

## 3.2 One primary job per screen

Each major screen should answer one dominant user question.

| Screen | Main question |
|---|---|
| Home | What should I do next? |
| Discover | Where can I shoot or what is happening nearby? |
| Shoot | What kind of round do I want to start? |
| Live Round | What score do I record for this target? |
| Result | How did I do? |
| Activity | Am I improving? |
| Training | Who can I shoot with? |
| Club | What is happening in my club? |
| Event | What do I need to know or do for this event? |

## 3.3 Sports product, not generic SaaS

The interface should feel:

- premium;
- outdoors-oriented;
- functional;
- active;
- confident;
- mature;
- European;
- specialist.

Avoid:

- oversized empty cards;
- excessive white space;
- glassmorphism;
- generic dashboard widgets;
- cartoon gamification;
- decorative complexity;
- inconsistent icon sets;
- oversized headers.

## 3.4 Progressive complexity

A first-time user should be able to start a round within seconds.

Advanced capabilities should appear only when relevant.

## 3.5 Always show the next useful action

This is one of the most important product rules.

ArcTrail should use the current user state to determine what deserves priority.

Examples:

- unfinished round → **Resume Round**
- user at a known field → **Start Round**
- public training nearby today → **Join Training**
- round just completed → **View Analysis**
- no rounds yet → **Start Your First Round**
- unresolved club safety report → **Review Safety Report**
- registered event this weekend → **View Event Details**

The app should feel situationally aware without becoming intrusive.

---

# 4. Core Product Loop

## 4.1 Discover

The user finds:

- fields;
- courses;
- clubs;
- public trainings;
- events;
- competitions.

## 4.2 Shoot

The user starts:

- quick training;
- official federation round;
- custom round;
- competition round.

## 4.3 Improve

The user sees:

- round score;
- accuracy;
- progress;
- history;
- personal records;
- equipment performance;
- course performance.

## 4.4 Connect

The user:

- joins training;
- interacts with a club;
- messages participants;
- invites friends;
- shares results.

## 4.5 Compete

The user:

- registers for an event;
- participates;
- sees leaderboards and results;
- compares performance;
- returns for another activity.

---

# 5. User Roles

## 5.1 Archer

Needs:

- discover fields;
- discover training;
- start rounds quickly;
- score accurately;
- use federation rules;
- continue offline;
- review history;
- compare progress;
- manage equipment;
- join clubs;
- join events;
- message relevant users;
- control privacy.

## 5.2 Club Member

Additional needs:

- follow club activity;
- join club trainings;
- receive club announcements;
- see events;
- see club rankings;
- interact with members.

## 5.3 Club Manager

Needs:

- claim club;
- verify ownership;
- manage club profile;
- manage fields;
- manage courses;
- receive and resolve field reports;
- publish trainings;
- manage members;
- create events;
- message members;
- monitor engagement.

## 5.4 Event Organizer

Needs:

- create competitions;
- configure federation rules;
- create divisions;
- manage registration;
- manage participant groups;
- manage scores;
- publish leaderboards;
- publish official results.

## 5.5 Platform Admin

Needs:

- approve club claims;
- manage abuse/moderation;
- manage federation metadata;
- manage rulesets;
- manage language/content;
- resolve disputes;
- moderate marketplace;
- inspect audit logs.

---

# 6. Global Information Architecture

## 6.1 Desktop navigation

Recommended:

`Logo | Home | Discover | Shoot | Activity | Clubs | Events | Market`

Right-hand utilities:

`Search | Messages | Notifications | Language | Avatar`

Rules:

- Shoot should have slightly stronger visual emphasis.
- Profile should not be a main navigation tab.
- Messages and notifications should remain utilities.
- Language should be compact.
- Do not use a large orange “Change” button.

## 6.2 Mobile navigation

Persistent bottom navigation:

1. Home
2. Discover
3. Shoot
4. Activity
5. Clubs

Shoot should be visually central.

Secondary destinations inside profile / More:

- Events
- Marketplace
- Messages
- Equipment
- Achievements
- Settings

---

# 7. Product Vocabulary

Use these terms consistently in UI, code and translations.

| Term | Meaning |
|---|---|
| Field | Physical 3D archery location |
| Course | A target route/layout inside a field |
| Target | One shooting target |
| Round | One scored shooting activity |
| Training | Informal scheduled shooting meetup |
| Competition | Structured scored sporting event |
| Event | Generic scheduled activity |
| Club | Archery organization |
| Ruleset | Federation or discipline scoring configuration |
| Field Report | Issue reported about a field/course |
| Equipment Setup | Bow + arrow configuration used during rounds |

### Required terminology update

Current label:

**Free Competition**

Replace with:

**Custom Round**

Description:

> Create your own targets and scoring setup.

---

# 8. Complete Route Inventory

## 8.1 Core

```text
/
 /home
 /discover
 /fields/:fieldId
 /shoot
 /shoot/new
 /shoot/:roundId
 /rounds/:roundId
 /rounds/:roundId/result
 /activity
 /activity/rounds
 /activity/stats
 /activity/records
```

## 8.2 Community

```text
/trainings
/trainings/new
/trainings/:trainingId

/clubs
/clubs/:clubId
/clubs/:clubId/members
/clubs/:clubId/rankings

/club/manage
/club/manage/fields
/club/manage/fields/:fieldId
/club/manage/trainings
/club/manage/reports
/club/manage/members
```

## 8.3 Events

```text
/events
/events/:eventId
/events/:eventId/register
/events/:eventId/participants
/events/:eventId/groups
/events/:eventId/results
/events/:eventId/live

/rankings
```

## 8.4 Identity / retention

```text
/profile/:username
/profile/equipment
/achievements
/messages
/notifications
/settings
```

## 8.5 Marketplace

```text
/market
/market/new
/market/:listingId
```

---

# 9. Design System

## 9.1 Visual direction

Keep the existing ArcTrail identity but professionalize it.

Use:

- forest green;
- warm cream;
- subtle orange accents;
- strong dark text;
- high-quality forest / field photography;
- subtle topographic lines;
- target-ring geometry;
- route/map motifs.

Avoid:

- camouflage;
- excessive gradients;
- giant rounded containers;
- overly decorative iconography.

## 9.2 Suggested color tokens

```css
:root {
  --forest-950: #153B21;
  --forest-900: #1D4D2B;
  --forest-800: #245E32;
  --forest-700: #2F7540;

  --orange-600: #C74F0B;
  --orange-500: #DF6116;
  --orange-100: #FFF0E6;

  --sand-50: #FAF9F5;
  --sand-100: #F4F2EA;
  --sand-200: #E3DFD3;

  --ink-950: #151814;
  --ink-800: #2C302B;
  --ink-700: #484D46;
  --ink-500: #72786F;

  --success: #2F7540;
  --warning: #BD8100;
  --danger: #B42318;
  --info: #2E6CA4;
}
```

Exact values may be adjusted after inspecting the current theme.

## 9.3 Semantic color use

Green:

- primary brand;
- primary sport action;
- positive states;
- selected navigation.

Orange:

- secondary emphasis;
- event / join / publish;
- meaningful attention.

Red:

- destructive actions;
- safety alerts;
- serious errors.

## 9.4 Typography

Preferred UI families:

- Inter;
- Geist;
- Manrope.

Use one primary family across the product.

Suggested scale:

```text
Display: 48–56px desktop / 36–44px mobile
H1: 36–40 / 30–34
H2: 26–30 / 22–26
H3: 20–22 / 18–20
Body: 16 minimum
Small: 14
Micro: 12–13
```

## 9.5 Radius

```text
Input: 10–12px
Standard card: 14–16px
Feature card: 18–20px
Pills: full radius
```

## 9.6 Spacing

8px base rhythm.

Recommended:

```text
4
8
12
16
24
32
48
64
96
```

---

# 10. Home Page

## Route

`/home`

## Purpose

The Home page is the user's sports command center.

It must answer:

> **What is the most useful thing I can do right now?**

## 10.1 Global header

Desktop target height:

72–80px.

Contains:

- ArcTrail logo;
- primary navigation;
- messages;
- notifications;
- language;
- avatar.

Avoid the current oversized header.

## 10.2 Hero state A — normal

Example:

> Good morning, Alessandro.

> Ready to shoot?

Primary buttons:

- **Start a Round**
- **Find a Field**

Optional contextual content:

- weather;
- nearest field;
- current city/region.

Weather must remain secondary.

## 10.3 Hero state B — active round

If an unfinished round exists, the hero should switch priority.

Example:

> Continue your round

> VCO & Valgrande · Target 11 of 24

Primary:

**Resume Round**

Secondary:

**View Round**

## 10.4 Performance strip

Maximum four metrics:

- Average Score
- Rounds This Month
- Best Round
- Targets Shot

Use real user data only.

## 10.5 Nearby activity

Heading:

> **What’s happening near you**

Prioritize:

1. training today;
2. event today;
3. training tomorrow;
4. event this weekend.

Each training card:

- field;
- time;
- date;
- distance;
- target count if known;
- participant avatars;
- participant count;
- remaining spots;
- join CTA.

## 10.6 Progress snapshot

Chart:

**Score Development**

Tabs:

- This Month
- Last 3 Months
- This Year

CTA:

**View Full Stats**

## 10.7 Recent round

Show:

- field;
- date;
- score;
- score delta;
- federation;
- target count;
- small accuracy visual.

CTA:

**View History**

## 10.8 Useful actions

Compact actions:

- Resume Round
- Field Report
- My Clubs
- Marketplace
- Invite Friends

## 10.9 Utility panel

Optional for lower section:

> **ArcTrail works everywhere**

Benefits:

- Offline Scoring
- Federation Rules
- Secure Sync

May be removed for active returning users if it adds no value.

## Acceptance criteria

- primary next action visible without scrolling on mobile;
- active round always receives top priority;
- all metrics are real;
- nearby content is based on actual location/selection;
- page works without nearby data;
- no giant empty card areas.

---

# 11. Discover

## Route

`/discover`

## Product inspiration

AllTrails-style discovery.

## Purpose

Answer:

> **Where can I shoot and what is happening nearby?**

## 11.1 Search

Placeholder:

> Search fields, clubs or places

Options:

- use current location;
- manual location selection.

Do not request location permission until necessary.

## 11.2 Tabs

- Fields
- Trainings
- Events
- Clubs

Default:

**Fields**

## 11.3 Map / List

Persistent control:

`Map | List`

Desktop can use split view.

Mobile should switch between full-screen map and full-screen list.

## 11.4 Filters

Only expose filters backed by reliable data.

Potential:

- distance;
- field status;
- target count;
- federation;
- training today;
- events;
- facilities.

## 11.5 Field card

Show:

- field name;
- town / region;
- distance;
- target count;
- federation tags;
- status;
- training today indicator;
- image.

Actions:

- View Field
- Start Round
- Directions

## 11.6 Map markers

Types:

- Field
- Training
- Event

Selected marker opens a preview card.

## Empty state

> No 3D fields found in this area.

Actions:

- Expand radius
- Search elsewhere

---

# 12. Field Detail Page

## Route

`/fields/:fieldId`

## Purpose

This is the canonical ArcTrail page for a physical archery field.

## 12.1 Hero

Show:

- field name;
- location;
- hero image;
- club;
- distance;
- federation tags;
- current status.

Primary actions:

1. **Start Round**
2. **Directions**
3. **Announce Training**

## 12.2 Overview metrics

Where available:

- courses;
- targets;
- route length;
- elevation;
- difficulty;
- estimated duration.

## 12.3 Information

Possible:

- description;
- terrain;
- opening hours;
- access;
- parking;
- facilities;
- fees;
- contact;
- website.

Never show unknown values as if known.

## 12.4 Courses

Each course card:

- course name;
- target count;
- difficulty;
- rules/federation;
- status.

## 12.5 Course map

Architect for:

- route;
- targets;
- start/end;
- elevation.

This can be a later feature.

## 12.6 Open training

Show upcoming training sessions.

## 12.7 Events

Show upcoming events.

## 12.8 Field status

Examples:

> Course open

> Target 18 reported damaged

## 12.9 Report issue

CTA:

**Report an Issue**

---

# 13. Shoot Landing

## Route

`/shoot`

## Purpose

Start a round as quickly as possible.

Header:

> **What are you shooting today?**

## 13.1 Active round

If active round exists, this appears first.

> Continue Your Round

Show:

- field;
- course;
- target progress;
- last save state.

CTA:

**Resume**

## 13.2 Quick Training

Title:

**Quick Training**

Description:

> Start immediately. Choose targets and arrows as you go.

CTA:

**Start Training**

## 13.3 Official Round

Title:

**Official Round**

Description:

> Use federation or competition scoring rules.

CTA:

**Choose Rules**

## 13.4 Custom Round

Title:

**Custom Round**

Description:

> Create your own targets and scoring setup.

CTA:

**Create Round**

---

# 14. Ruleset Selection

## Route

Part of `/shoot/new`

## Sections

1. Recent
2. Recommended
3. Federation
4. Country
5. All

Search:

> Search federation or discipline

Each ruleset card:

- federation;
- discipline;
- arrows per target;
- scoring explanation.

Do not show unexplained abbreviations only.

---

# 15. Pre-Round Setup

## Route

`/shoot/new`

Only require fields necessary for scoring.

Potential fields:

- field;
- course;
- ruleset;
- equipment setup;
- participants;
- visibility.

Use intelligent defaults:

- recent field;
- nearest field;
- default federation;
- default equipment.

CTA:

**Start Round**

---

# 16. Live Round / Scoring

## Route

`/shoot/:roundId`

## Criticality

This is the most important operational screen in the product.

Reliability is more important than aesthetics.

## 16.1 Layout

Hide unnecessary global navigation.

Top:

> Target 7 / 24

Secondary:

> VCO & Valgrande · FIARC

Display sync status:

- Saved
- Saved Offline
- Syncing
- Sync Failed

## 16.2 Target information

Where available:

- target image;
- target category;
- distance;
- shooting peg/class.

## 16.3 Score controls

Score controls must adapt to the ruleset.

Requirements:

- very large;
- high contrast;
- one-handed;
- accessible;
- clear selected state;
- no reliance on color alone.

## 16.4 Navigation

- Previous Target
- Save & Next
- Undo
- More

## 16.5 Offline behavior

If offline:

> Saved offline — we’ll sync when you reconnect.

Scoring must continue normally.

## 16.6 Persistence

Persist after every meaningful score change.

Local persistence must happen before remote success is required.

## 16.7 Recovery

If the browser/app reloads:

> We found an unfinished round.

CTA:

**Resume Round**

Never silently discard scoring data.

---

# 17. Round Result

## Route

`/rounds/:roundId/result`

## Purpose

Deliver emotional payoff and meaningful feedback.

Hero:

> Round complete

Large score:

**212 pts**

Secondary:

> +8 vs your previous round here

If true:

> **New personal best**

## 17.1 Metrics

- total score;
- average per target;
- misses;
- duration;
- targets completed;
- first-arrow performance where relevant.

## 17.2 Accuracy

Only if the scoring model supports it.

Potential categories:

- Kill
- Vital
- Wound
- Miss

## 17.3 Actions

Primary:

**View Analysis**

Secondary:

- Share Result
- Add Note
- Done

## 17.4 Share card

Include:

- ArcTrail;
- display name if allowed;
- field;
- score;
- date;
- ruleset;
- personal best indicator.

Do not expose precise private location data.

---

# 18. Round Detail

## Route

`/rounds/:roundId`

Show:

- score summary;
- target-by-target results;
- notes;
- field/course;
- ruleset;
- equipment;
- participants;
- personal best context.

Actions:

- Start Similar Round
- Export
- Delete

Delete requires confirmation.

---

# 19. Activity

## Route

`/activity`

## Purpose

Turn historical score data into long-term retention.

Tabs:

- Overview
- Rounds
- Stats
- Records
- Achievements

## 19.1 Season summary

Example:

### 2026 Season

- 24 rounds
- 582 targets
- 212 average
- 226 best

## 19.2 Primary graph

**Score Development**

Default time:

current season or last 90 days.

## 19.3 Comparative insight

Examples only when supported:

> Your average increased 6.3% this month.

> You score 7% higher at VCO & Valgrande than your overall field average.

Never generate unsupported insights.

---

# 20. Round History

## Route

`/activity/rounds`

Filters:

- date;
- field;
- course;
- federation;
- equipment setup.

Each item:

- date;
- field;
- ruleset;
- score;
- target count;
- PB indicator;
- score delta where useful.

Support pagination or infinite loading.

---

# 21. Performance Stats

## Route

`/activity/stats`

## Product inspiration

Garmin Connect / Strava.

## Metrics

### Score trend

Line chart.

### Accuracy distribution

If applicable.

### Performance by field

### Performance by course

### Performance by distance

Only if distance data is reliable.

### First arrow vs later arrows

Only for compatible rules.

### Performance by equipment

## Filters

- 30 days;
- 90 days;
- season;
- year;
- custom;
- ruleset;
- equipment.

## Data-quality rules

If not enough data:

> Not enough data yet.

Do not create misleading comparisons from tiny samples.

---

# 22. Personal Records

## Route

`/activity/records`

Possible records:

- best official round;
- best custom round;
- highest average;
- most targets in one month;
- longest activity streak;
- most visited field;
- best result by federation;
- best result by equipment.

Each record:

- value;
- date;
- context;
- link to round.

---

# 23. Achievements

## Route

`/achievements`

Tone:

mature, restrained, sport-focused.

Examples:

- First Round
- 100 Targets
- 500 Targets
- 10 Fields
- First Competition
- New Personal Best
- 5 Open Trainings
- Season Milestone

Avoid:

- artificial currencies;
- loot boxes;
- childish animation;
- excessive badges.

---

# 24. Equipment / Gear Locker

## Route

`/profile/equipment`

## Purpose

Connect equipment to performance data.

## Equipment Setup fields

- name;
- bow type;
- brand;
- model;
- draw weight;
- handedness;
- arrow brand;
- arrow model;
- spine;
- arrow length;
- point weight;
- notes;
- image.

Example:

### Traditional Setup

Bearpaw Black Kiowa  
45 lbs · Right handed  
Carbon arrows · 500 spine

Actions:

- Add Setup
- Edit
- Archive
- Set Default

Historical rounds must retain archived setup references.

Future insight:

> Your average with this setup is 8.4% higher than your season average.

Only show when sample size is meaningful.

---

# 25. Training Discovery

## Route

`/trainings`

Headline:

> **Shoot together.**

Filters:

- Today
- Tomorrow
- Weekend
- Nearby
- Club Only

Each card:

- field;
- date/time;
- host;
- participant count;
- capacity;
- spots left;
- visibility;
- skill level if provided.

CTA:

**Join**

---

# 26. Create Training

## Route

`/trainings/new`

Target completion time:

under 1 minute.

Fields:

### Where?
Field selector.

### When?
- Today
- Tomorrow
- Custom

### Time?
Time selector.

### Capacity?
- 4
- 8
- 12
- Unlimited
- Custom

### Visibility?
- Everyone
- Club Members
- Invite Only

Optional:

- duration;
- ruleset;
- skill level;
- notes.

CTA:

**Publish Training**

---

# 27. Training Detail

## Route

`/trainings/:trainingId`

Show:

- field;
- date;
- time;
- host;
- participant list;
- spots remaining;
- notes;
- optional weather;
- directions.

Visitor actions:

- Join
- Leave
- Directions
- Message Group

Host actions:

- Edit
- Cancel
- Message Participants
- Remove Participant
- Close Registration

Cancellation must notify participants where notification infrastructure exists.

---

# 28. Clubs Landing

## Route

`/clubs`

Tabs:

- My Clubs
- Discover
- Manage

Manage appears only for authorized users.

Filters:

- country;
- region;
- federation;
- proximity.

---

# 29. Public Club Page

## Route

`/clubs/:clubId`

Hero:

- club name;
- logo;
- location;
- federation;
- member count if public;
- fields;
- upcoming activity.

CTA:

- Join Club
- Request Membership
- Manage Club

Tabs:

- Overview
- Fields
- Trainings
- Events
- Rankings
- Members

Overview should show:

- club description;
- fields;
- next training;
- next event;
- relevant recent activity;
- contact info.

---

# 30. Club Claim Flow

Current process is too administrative.

Replace with benefit-first onboarding.

## Intro

# Bring your club to ArcTrail

> Manage your field, communicate with archers and grow participation.

Benefits:

- manage courses;
- publish training;
- receive field reports;
- create rankings;
- organize events;
- communicate with members.

CTA:

**Find My Club**

## Verification

Step 1:
Select club.

Step 2:
Enter:

- full name;
- role;
- official club email;
- optional note.

Step 3:
Verification / approval.

Preferred:

- verification email;
- admin approval.

If manual email remains necessary, generate the email rather than making the user compose it manually.

Step 4:

> We’re verifying your request. We’ll notify you when management access is approved.

---

# 31. Club Management Dashboard

## Route

`/club/manage`

## Purpose

A lightweight operating system for clubs.

KPI cards:

- Active Members
- Upcoming Trainings
- Upcoming Events
- Open Field Reports

Priority queue:

- safety reports;
- unresolved target problems;
- pending membership requests;
- upcoming event tasks.

Quick actions:

- Announce Training
- Create Event
- Manage Field
- Message Members

---

# 32. Club Field Management

## Route

`/club/manage/fields/:fieldId`

Editable:

- field description;
- status;
- opening/access;
- parking;
- facilities;
- photos;
- courses;
- target metadata;
- contact details.

Future:

**Course Builder**

Possible functionality:

- map route;
- place targets;
- reorder targets;
- assign numbers;
- mark status.

Do not build advanced course mapping before core field management is stable.

---

# 33. Field Reports

Rename the existing “Report a problem on a course” to:

**Field Report**

Categories:

- Damaged Target
- Safety Issue
- Missing Marker
- Blocked Trail
- Incorrect Location
- Course Information
- Other

Form:

- field;
- course;
- target;
- category;
- description;
- photo;
- approximate location if permission granted.

CTA:

**Send Report**

Confirmation:

> Report sent to VCO & Valgrande.

Manager statuses:

- New
- Reviewing
- In Progress
- Resolved
- Rejected

Safety issues must receive highest visual priority.

Reporter identity must not be displayed publicly.

---

# 34. Events Discovery

## Route

`/events`

## Purpose

Become the event discovery layer for 3D archery.

Filters:

- Nearby
- This Weekend
- Country
- Region
- Federation
- Discipline

Event card:

- name;
- date;
- field;
- federation;
- registration state;
- registered/capacity where public.

CTA:

**View Event**

---

# 35. Event Detail

## Route

`/events/:eventId`

Hero:

- event name;
- date;
- field;
- organizer;
- federation;
- registration status.

Primary CTA:

**Register**

After registration:

**Registration Confirmed**

Tabs:

- Overview
- Participants
- Groups
- Results
- Course
- Information

Overview:

- description;
- schedule;
- rules;
- divisions;
- capacity;
- registration deadline;
- organizer;
- venue.

---

# 36. Event Registration

## Route

`/events/:eventId/register`

Fields depend on event setup.

Potential:

- division;
- age class;
- bow category;
- club;
- equipment;
- notes;
- confirmations.

Include a review step before final submission.

Prevent registration beyond capacity.

---

# 37. Live Leaderboard

## Route

`/events/:eventId/live`

## Purpose

Public spectator-friendly standings.

Columns:

- Rank
- Archer
- Club
- Category
- Score
- Targets Completed / Status

Filters:

- division;
- bow class;
- category.

Use realtime subscriptions or safe polling according to architecture.

Results must clearly show state:

- Live
- Provisional
- Official

Never mark results official unless organizer status confirms it.

---

# 38. Rankings

## Route

`/rankings`

Potential sections:

- Personal
- Club
- Field
- Event

Regional or national rankings must only be added if legitimate and supported by data/federation rules.

Do not invent pseudo-official rankings.

---

# 39. Marketplace

## Route

`/market`

Priority remains below core sport/community features.

Design direction:

more visual, closer to Vinted than traditional classifieds.

Categories:

- Bows
- Arrows
- Quivers
- Sights
- Releases
- Accessories
- Targets
- Clothing

Filters:

- bow type;
- draw weight;
- draw length;
- handedness;
- spine;
- brand;
- condition;
- location;
- price.

---

# 40. Listing Detail

## Route

`/market/:listingId`

Show:

- large images;
- title;
- price;
- technical attributes;
- condition;
- seller;
- approximate location;
- description.

Actions:

- Message Seller
- Save
- Report

No payment processing unless separately scoped.

---

# 41. Messages

## Route

`/messages`

Messaging should show context.

Thread types:

- Training
- Club
- Event
- Marketplace
- Direct

Example:

**Training · VCO & Valgrande**  
Marco: “I’ll arrive around 14:15.”

Do not rely on sender name alone.

---

# 42. Notifications

## Route

`/notifications`

Categories:

- training;
- club;
- event;
- field report;
- marketplace;
- message;
- achievement;
- system.

Examples:

- Marco joined your training.
- Your club claim has been approved.
- Target 18 report was resolved.
- Registration opened for Piemonte 3D.
- You set a new personal record.

Users should be able to configure notification categories.

---

# 43. Profile

## Route

`/profile/:username`

A lightweight sporting identity.

Header:

- avatar;
- name;
- broad location;
- club;
- bow type;
- short bio.

Stats, subject to privacy:

- rounds;
- targets;
- fields;
- average score.

Tabs:

- Activity
- Stats
- Clubs

Do not expose exact personal location history by default.

---

# 44. Settings

## Route

`/settings`

Sections:

- Account
- Privacy
- Notifications
- Language
- Units
- Default Federation
- Default Equipment
- Location
- Offline Data
- Security

Language can also exist as a compact header control.

---

# 45. Public Marketing Website

The public website must sell ArcTrail as a sports platform.

## Hero

# One app for 3D archery.

> Find fields. Shoot rounds. Track your progress. Meet other archers.

CTAs:

- **Start Shooting — Free**
- **Find a Field**

## Product sections

### Find somewhere to shoot
Discover 3D archery fields around you.

### Score every round
Use federation and custom scoring systems.

### Works in the forest
Score even when reception disappears.

### See yourself improve
Track rounds, averages and personal records.

### Never shoot alone
Find open training sessions nearby.

### Your club, connected
Manage courses, events, reports and communication.

## Federation section

# Shoot anywhere.

> ArcTrail knows the rules. You just shoot.

Display only actually supported federations/rulesets.

## Club CTA

# Bring your club to ArcTrail.

CTA:

**Claim Your Club**

---

# 46. Responsive Behavior

## Mobile

- bottom navigation;
- compact top header;
- full-width primary CTA;
- 1-column default;
- sticky scoring controls;
- score buttons optimized for outdoor use;
- avoid excessive padding.

## Tablet

- 1–2 column layouts;
- split content where useful;
- responsive map/list.

## Desktop

Normal content max-width:

1200–1440px.

Maps may use wider layouts.

Avoid stretching standard content across ultrawide screens.

---

# 47. Accessibility

Target:

**WCAG 2.2 AA**

Requirements:

- semantic HTML;
- keyboard navigation;
- logical headings;
- visible focus;
- accessible dialogs;
- correct form labels;
- proper error associations;
- sufficient contrast;
- non-color-only states;
- reduced-motion support;
- 44px touch targets;
- screen-reader-friendly score controls.

---

# 48. Offline and Reliability

Offline scoring is a defining product capability.

## Must work offline

At minimum:

- active round;
- current score;
- target progress;
- required round configuration;
- local notes.

## Architecture principles

- local-first score writes;
- background synchronization;
- idempotent server writes;
- retry queue;
- conflict handling;
- clear sync status.

Status language:

- Saved
- Saved Offline
- Syncing
- Sync Failed — Retry

## Data-loss standard

An active round should survive:

- browser refresh;
- temporary network loss;
- navigation mistake where recoverable;
- browser/app restart where technically feasible.

---

# 49. Privacy and Location

Location is sensitive.

Requirements:

- request only contextually;
- explain why permission is needed;
- never expose live GPS publicly;
- trainings use field location, not user GPS;
- activity visibility configurable;
- round history private by default unless the existing product intentionally differs;
- do not expose exact home location.

---

# 50. Internationalization

Every user-facing string must:

- use translation keys;
- support pluralization;
- support localized time/date;
- support localized number formats;
- support units by locale/preferences.

No hardcoded English in new production components.

Design must tolerate longer German, Dutch and Italian text.

---

# 51. Logical Data Model

Claude must inspect the existing database first.

Do not recreate blindly.

Suggested logical entities:

```text
users
profiles
user_preferences

clubs
club_members
club_claims

fields
field_photos
courses
targets
field_reports

federations
rulesets
ruleset_scoring

equipment_setups

rounds
round_participants
round_targets
round_scores
round_notes

trainings
training_participants

events
event_divisions
event_registrations
event_groups
event_group_members
event_results

message_threads
thread_participants
messages

notifications

marketplace_listings
marketplace_images
marketplace_saved
```

---

# 52. Permissions

Suggested roles:

```text
user
club_member
club_manager
club_admin
event_organizer
platform_admin
```

Rules:

- club managers only manage their own club(s);
- event organizers only manage authorized events;
- users only edit their own rounds unless event scoring permissions allow otherwise;
- admin actions should be auditable;
- UI hiding is not authorization.

All sensitive writes require server-side authorization.

---

# 53. Analytics

## Acquisition

```text
signup_started
signup_completed
onboarding_completed
club_claim_started
club_claim_submitted
club_claim_approved
```

## Discover

```text
discover_opened
location_permission_requested
location_permission_granted
field_viewed
field_directions_clicked
training_viewed
event_viewed
```

## Shoot

```text
round_start_clicked
round_started
round_resumed
score_entered
round_completed
round_abandoned
round_sync_failed
```

## Performance

```text
activity_viewed
stats_viewed
record_viewed
share_card_created
```

## Community

```text
training_created
training_joined
training_left
club_join_requested
message_sent
```

## Events

```text
event_registration_started
event_registration_completed
event_results_viewed
```

---

# 54. Product Metrics

## North Star

> **Completed rounds per active archer per month**

Supporting metrics:

- weekly active archers;
- monthly active archers;
- round completion rate;
- rounds per active user;
- 30-day retention;
- trainings created;
- training join rate;
- field views → round starts;
- active clubs;
- club claims;
- event registrations;
- sync success rate.

---

# 55. Monetization Direction

Do not prioritize monetization before strong engagement.

## Archer

Core experience remains free.

Possible future premium:

- advanced analytics;
- deeper equipment analytics;
- advanced exports;
- season reports.

## Club

Potential future subscription:

**€19–€49/month**

Possible paid value:

- member management;
- advanced club dashboard;
- field management;
- event management;
- communication;
- rankings;
- analytics.

## Organizer / Federation

Future:

- registration management;
- competition operations;
- live scoring;
- federation exports;
- APIs.

No monetization implementation unless separately scoped.

---

# 56. SEO

Public indexable pages should include:

- field pages;
- club pages;
- events;
- regional field discovery.

Possible patterns:

```text
/fields/italy/piemonte
/fields/vco-valgrande
/clubs/asd-arcieri-vco
/events/piemonte-3d-championship
```

Use structured data where appropriate.

Do not expose private activity to search engines.

---

# 57. Performance Requirements

- fast mobile initial load;
- route-level code splitting;
- lazy-loaded maps;
- lazy-loaded charts;
- optimized images;
- minimized client bundle;
- avoid large libraries where native/simple alternatives exist.

Scoring must feel instantaneous.

Score entry must not wait on network response.

---

# 58. Security

Requirements:

- secure authentication;
- protected server APIs;
- scoped roles;
- sanitized user content;
- validated uploads;
- MIME/file-size restrictions;
- rate limiting;
- no client-side secrets;
- administrative audit logs;
- GDPR-aware handling.

---

# 59. Loading, Empty, Error and Offline States

Every major page must support:

```text
Loading
Loaded
Empty
Error
Offline where relevant
Unauthorized where relevant
```

## Examples

### No rounds

> Your first score starts here.

CTA:

**Start a Round**

### No nearby training

> No training has been announced nearby yet.

CTA:

**Announce a Training**

### No club

> Find your club and connect with local archers.

CTA:

**Find Clubs**

### Sync error

> We couldn’t sync this score right now. Your round is still saved on this device.

Actions:

- Retry
- Continue Offline

---

# 60. Copywriting Rules

Tone:

- concise;
- direct;
- sporting;
- competent;
- natural;
- not childish.

Prefer verb-led CTA labels.

Good:

- Start Round
- Join Training
- Find Field
- Claim Club
- Send Report
- Resume Round
- View Results

Avoid vague labels:

- Change
- Proceed
- Submit
- Continue

unless context is unmistakable.

---

# 61. Recommended Component Architecture

Exact implementation depends on current framework.

Potential reusable domain components:

```text
AppShell
DesktopNav
MobileBottomNav
AccountMenu

SectionHeader
MetricCard
PrimaryActionCard
StatusBadge
AvatarGroup
EmptyState
SkeletonCard

FieldCard
FieldMap
FieldFilters
CourseCard

RoundStartCard
RulesetSelector
RoundProgress
TargetScoringPanel
OfflineStatus
RoundSummaryCard

PerformanceMetric
TrendChart
AccuracyChart
RecordCard

TrainingCard
TrainingParticipantList
TrainingForm

ClubCard
ClubHeader
ClubDashboardMetric
ClubClaimWizard

FieldReportForm
FieldReportCard

EventCard
EventRegistrationForm
LeaderboardTable

EquipmentCard
EquipmentForm

MarketplaceCard
ListingGallery

MessageThread
NotificationItem
```

Use shared primitives to avoid style duplication.

---

# 62. Implementation Roadmap

Do not build all screens at once.

---

# Phase 0 — Technical Audit

Before redesigning, Claude must inspect:

- framework;
- package manager;
- routes;
- components;
- state management;
- auth;
- database;
- APIs;
- rulesets;
- scoring logic;
- offline persistence;
- service worker / PWA status;
- i18n;
- messaging;
- permissions;
- current event functionality;
- tests;
- deployment.

Claude must create:

`docs/ARCTRAIL_TECHNICAL_AUDIT.md`

The audit must map:

- current functionality;
- reusable code;
- fragile code;
- missing features;
- migration risks;
- database implications.

No major refactor before this audit.

---

# Phase 1 — Foundation

Build:

- tokens;
- typography;
- buttons;
- cards;
- forms;
- badges;
- alerts;
- skeletons;
- dialogs;
- desktop nav;
- mobile nav;
- account menu;
- loading states;
- error states.

Acceptance:

- compact header;
- responsive navigation;
- language demoted;
- styling consistent;
- old routes still work;
- accessibility basics implemented.

---

# Phase 2 — Home

Build:

- contextual hero;
- Start / Resume;
- performance strip;
- nearby activity;
- progress chart;
- recent round;
- useful actions.

Acceptance:

- next best action is obvious;
- active round gets highest priority;
- metrics use real data;
- mobile CTA visible immediately;
- secondary modules do not block initial rendering.

---

# Phase 3 — Discover + Fields

Build:

- Discover;
- location search;
- map/list;
- filters;
- field cards;
- field detail;
- course list;
- training preview;
- event preview;
- directions.

Acceptance:

- field discovery happens inside ArcTrail;
- external maps used for navigation, not discovery;
- location permission contextual;
- mobile map/list usable.

---

# Phase 4 — Shoot + Live Round + Results

Highest quality bar.

Build:

- Shoot landing;
- Quick Training;
- Official Round;
- Custom Round;
- Ruleset selection;
- Pre-Round Setup;
- Live Scoring;
- Offline status;
- Recovery;
- Round Result;
- Round Detail.

Acceptance:

- no scoring regression;
- all current rulesets still work;
- active round survives refresh;
- offline mode works;
- sync state clear;
- no duplicate completion;
- scoring usable one-handed outdoors.

---

# Phase 5 — Activity / Performance

Build:

- Activity overview;
- Round History;
- Stats;
- Records;
- chart components;
- filters.

Acceptance:

- real data only;
- sample-size handling;
- correct calculations;
- good empty states.

---

# Phase 6 — Training Community

Build:

- Training discovery;
- Create Training;
- Training Detail;
- Join/Leave;
- host controls;
- participant messaging.

Acceptance:

- create flow under one minute;
- permissions correct;
- cancellation safe;
- participants updated where infrastructure allows.

---

# Phase 7 — Clubs

Build:

- Club discovery;
- Public Club Page;
- Claim Flow;
- Club Dashboard;
- Field Management;
- Reports;
- Members.

Acceptance:

- club managers scoped correctly;
- claim status clear;
- safety reports prioritized;
- non-managers blocked from management.

---

# Phase 8 — Profile / Equipment / Achievements

Build:

- Profile;
- Privacy;
- Equipment setups;
- Equipment-round links;
- Records enhancements;
- Achievements.

Acceptance:

- public profile respects privacy;
- archived equipment remains historically linked;
- equipment analytics only after enough data.

---

# Phase 9 — Events / Competition

Build only after prior phases are stable.

Build:

- Event discovery;
- Event Detail;
- Registration;
- Participants;
- Groups;
- Results;
- Live Leaderboard.

Acceptance:

- capacity respected;
- organizer permissions enforced;
- live/provisional/official states clear;
- scoring integrates without breaking personal rounds.

---

# Phase 10 — Marketplace

Build:

- browse;
- filters;
- listing;
- create;
- save;
- message;
- report.

No payment system unless separately approved.

---

# 63. Page-State Matrix

Every route must deliberately handle page state.

| Page | Loading | Empty | Error | Offline | Unauthorized |
|---|---:|---:|---:|---:|---:|
| Home | ✓ | ✓ | ✓ | Partial | — |
| Discover | ✓ | ✓ | ✓ | Cached/limited | — |
| Field | ✓ | ✓ | ✓ | Cached/limited | — |
| Shoot | ✓ | ✓ | ✓ | ✓ | — |
| Live Round | ✓ | — | ✓ | ✓ | — |
| Activity | ✓ | ✓ | ✓ | Cached | — |
| Training | ✓ | ✓ | ✓ | Limited | Conditional |
| Club Manage | ✓ | ✓ | ✓ | Limited | ✓ |
| Events | ✓ | ✓ | ✓ | Limited | Conditional |
| Marketplace | ✓ | ✓ | ✓ | Limited | Conditional |

---

# 64. Definition of Done

A phase is complete only when:

- desktop works;
- mobile works;
- tablet works;
- keyboard navigation works;
- translations exist;
- loading state exists;
- empty state exists;
- error state exists;
- offline state exists where relevant;
- authorization is correct;
- existing data is preserved;
- production build passes;
- typecheck passes;
- lint passes;
- critical tests pass;
- obvious console errors are resolved;
- manual QA is documented.

---

# 65. Critical QA Checklist

## Global

- [ ] Header compact
- [ ] Mobile bottom nav functional
- [ ] Shoot always easy to access
- [ ] Language secondary
- [ ] Responsive
- [ ] Consistent tokens
- [ ] Keyboard navigation
- [ ] Focus state visible
- [ ] No hardcoded new strings

## Home

- [ ] Active round takes priority
- [ ] Start Round works
- [ ] Find Field works
- [ ] Nearby activity real
- [ ] Performance metrics real
- [ ] Empty state works

## Discover

- [ ] Location permission contextual
- [ ] Manual search works
- [ ] Map works
- [ ] List works
- [ ] Filters work
- [ ] Field detail works
- [ ] Directions work

## Shoot

- [ ] Quick Training
- [ ] Official Round
- [ ] Custom Round
- [ ] Resume Round
- [ ] Scoring
- [ ] Undo
- [ ] Previous/Next
- [ ] Local save
- [ ] Offline
- [ ] Recovery
- [ ] Sync
- [ ] Completion
- [ ] No duplicate completion

## Activity

- [ ] Rounds listed correctly
- [ ] Filters work
- [ ] Stats correct
- [ ] Records correct
- [ ] Insufficient-data handling

## Training

- [ ] Create
- [ ] Join
- [ ] Leave
- [ ] Host edit
- [ ] Host cancel
- [ ] Participant list
- [ ] Contextual messages

## Clubs

- [ ] Discover
- [ ] Public page
- [ ] Claim
- [ ] Pending state
- [ ] Manager dashboard
- [ ] Permission scoping
- [ ] Field management
- [ ] Reports

## Events

- [ ] Discover
- [ ] Event Detail
- [ ] Registration
- [ ] Capacity
- [ ] Participants
- [ ] Groups
- [ ] Results
- [ ] Leaderboard states

## Privacy

- [ ] Exact location not public
- [ ] Public profile respects settings
- [ ] Round visibility respected
- [ ] Reporter identity private

---

# 66. Non-Goals for Initial Redesign

Do not build initially:

- algorithmic social feed;
- follower economy;
- AI coaching;
- digital currency;
- betting/gambling;
- complex subscription architecture;
- native mobile apps unless separately planned;
- federation API integrations without confirmed requirements;
- advanced 3D course editor before core field management;
- speculative analytics unsupported by real data.

---

# 67. Success Criteria

The redesign succeeds when the app feels like one coherent sport platform instead of separate utilities.

A new user should understand ArcTrail as:

> **ArcTrail helps me find somewhere to shoot, score my round, improve, meet other archers and join events.**

The lifecycle should be obvious:

### Before
Find field, training or event.

### During
Score quickly and reliably.

### After
See results and insights.

### Between
Track progress and connect.

### Season
Build a meaningful sport history.

---

# 68. Strategic Product Identity

> **ArcTrail 3D — the digital home of 3D archery.**

Core loop:

> **Discover. Shoot. Improve. Connect. Compete.**

Primary UX rule:

> **Always show the next useful action.**

---

# 69. Claude Execution Protocol

Before every implementation phase, Claude must state:

```text
1. Existing functionality that can be reused
2. Files/components expected to change
3. Database/API implications
4. Main risks
5. Tests required
```

After every phase, Claude must report:

```text
1. What changed
2. Files changed
3. New components
4. Schema/data changes
5. Tests run
6. Manual QA completed
7. Known limitations
8. Recommended next phase
```

Claude must stop and report rather than guess if:

- scoring behavior is ambiguous;
- a federation rule is unclear;
- a migration risks data loss;
- existing permissions are unclear;
- offline support could be weakened;
- an event rule cannot be safely inferred.

---

# 70. First Instruction to Claude

When this document is added to the repository, give Claude this instruction:

> Read `ArcTrail3D_PRD_v2_1_Claude.md` completely. Do not start redesigning screens yet. First audit the existing ArcTrail 3D codebase and create `docs/ARCTRAIL_TECHNICAL_AUDIT.md`. Map all current routes, components, database entities, scoring logic, federation rules, offline persistence, translations, authentication, permissions, trainings, clubs, events, messaging and marketplace functionality against the PRD. Identify what can be reused, what requires refactoring, what is missing and what is risky. Preserve all working scoring and offline logic. Then produce a phased migration plan. Only after the audit is complete should implementation begin with Phase 1.

---

# 71. Priority Summary

If resources are limited, build in this order:

## Tier 1 — Core sport loop
1. Home
2. Discover
3. Field Detail
4. Shoot
5. Live Round
6. Round Result
7. Activity
8. Stats

## Tier 2 — Community
9. Trainings
10. Training Detail
11. Clubs
12. Club Page
13. Club Dashboard
14. Field Reports

## Tier 3 — Retention
15. Records
16. Equipment
17. Profile
18. Achievements

## Tier 4 — Competition
19. Events
20. Registration
21. Groups
22. Results
23. Live Leaderboard
24. Rankings

## Tier 5 — Commerce
25. Marketplace improvements

The platform should not attempt to look complete by building many shallow screens.

The core sport loop must become excellent first.

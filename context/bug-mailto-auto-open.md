# Bug: mailto: Links Auto-Opening Mail.app

## Status: RESOLVED

## Description

When a user failed to log in on the LoginScreen, a "request access" section appeared with a `mailto:` link to `admin@aravadistillery.com`. Clicking this link (or in some cases, the browser auto-navigating to it) caused Mail.app to open with a pre-filled draft email:

- **To:** admin@aravadistillery.com
- **Subject:** בקשת גישה למערכת Aravadistillery CRM

Similarly, in the ManagementScreen, after creating an invitation, a "שלח באימייל" (send via email) link used a `mailto:` URI with `buildInviteMailtoUri()` that also auto-opened the mail client.

The bug was reported multiple times because the Mail.app draft would persist in the Drafts folder even after the code fix was deployed, causing confusion.

## Root Cause

Three `mailto:` sources existed in the codebase:

1. **LoginScreen.tsx** — `<a href="mailto:admin@aravadistillery.com">` shown after failed login
2. **ManagementScreen.tsx** — `<a href={lastInviteMailto}>שלח באימייל</a>` shown after creating an invitation
3. **invitations.ts** — `buildInviteMailtoUri()` helper that generated `mailto:` URIs with subject/body

Using `<a href="mailto:...">` or navigating to a `mailto:` URI causes the OS default mail client to open immediately, which is disruptive and unexpected UX.

## Solution

**Commit:** `e601cdc` — "Remove all mailto: references from deployed app entirely"

All three `mailto:` sources were removed:

1. **LoginScreen.tsx** — Replaced the `<a href="mailto:...">` link with plain text: "לבקשת גישה, פנה למנהל המערכת." (To request access, contact the system administrator.)
2. **ManagementScreen.tsx** — Removed the "שלח באימייל" link and `lastInviteMailto` state. The success message now says "העתק את קישור ההזמנה מהטבלה ושלח למשתמש" (Copy the invite link from the table and send to the user).
3. **invitations.ts** — Deleted the `buildInviteMailtoUri()` helper entirely.

The invitation flow now relies on the admin manually copying the invite URL (via the copy button in the table) and sharing it through their preferred channel.

## Post-Fix: "Bug is back" False Alarm

After the fix was deployed, the user reported seeing the email draft again. Investigation confirmed:

- **0 instances** of `mailto` in the production JS bundle
- **0 instances** of `admin@aravadistillery.com` in any source file or deployed asset

The email draft was a **saved draft in Mail.app** from a previous session when the bug was active. The fix was to:
1. Delete the saved draft from Mail.app > Drafts
2. Hard-refresh the CRM site (Cmd + Shift + R)

## Key Lesson

Never use `mailto:` links in web apps — they auto-open the mail client which is disruptive. Instead, use clipboard copy for sharing pre-formatted messages, or the Web Share API for mobile devices.

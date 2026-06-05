---
name: check-ui-overlaps
description: Building/reviewing any UI — always scan for unintended element overlaps
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4a3c476c-b847-4d48-ab1e-2c243bfd213e
---

When building or reviewing any UI, explicitly check that fixed/absolutely-positioned elements don't overlap each other: status/HUD bars, floating toolbar buttons, banners, modals, countdown bars, toasts. The user caught a real case in the streaming game (`game-v2.html`) where the 人物/手记/静音 buttons (`position:absolute; top; right`) sat on top of the top status bar's resource meters.

**Why:** I often can't browser-test (Chrome automation was unavailable during overnight autonomous work), so visual overlaps slip through and the user has to catch them.

**How to apply:** After any layout/CSS change, scan every `position:fixed`/`absolute` element for overlap against bars/panels/each other, across all app phases (opening / play / reveal / settlement). Prefer in-flow layout (flex + `margin-left:auto`) over absolute positioning for toolbars. When unable to render, reason through the coordinates; when possible, open the page and verify. This is now also rubric item 9 in this project's `docs/POLISH_LOOP.md`.

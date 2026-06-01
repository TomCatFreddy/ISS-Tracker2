# Findings Backlog

- [ ] components/IssMap.tsx:38 — `positionRef` is dead state (written on every poll, never read); remove the ref and its assignment (from PR #15 review)
- [ ] components/IssMap.tsx:144 — `setInterval` doesn't await async `poll()`; a fetch slower than 5s can overlap and deliver out-of-order positions; guard with an in-flight flag (from PR #15 review)

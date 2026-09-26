# WORKFLOW.md

Comparing two ways of building the same feature — a resume file-upload component
for NextHire — first with a lazy one-line prompt, then with a disciplined,
spec-driven prompt in plan mode. Both were built in Claude Code on separate
branches from `main` so neither run could contaminate the other.

## The prompts

- **Round 1 (lazy):** "Add a file upload component to my app." One sentence, no
  context, no constraints.
- **Round 2 (disciplined):** A detailed spec — target files, allowed types
  (PDF/DOC/DOCX), a 5 MB limit, distinct error messages per failure, drag-and-drop,
  explicit visual states, accessibility requirements, worked examples of expected
  behavior, and a required verification step (write Vitest tests and run them).

## What actually happened

The most surprising result was that **Round 1 was not bad.** From one vague
sentence, Claude Code still produced a ~249-line `FileUpload.tsx`, a validation
module, and a 113-line test file. This matches the known failure mode of this
drill: after weeks of careful prompting habits, even a "lazy" prompt yields
something decent. So the comparison is not "nothing vs. something" — it is about
*quality, intent, and trustworthiness*.

## Specific diffs (not vibes)

- **Naming and domain fit:** Round 1 produced generic `FileUpload` /
  `validateFile`. Round 2 produced `ResumeUpload` / `validateResume` — named for
  what NextHire actually does. Round 2 deleted the generic files and replaced them.
- **More code is not better code:** Round 1's component was 249 lines; Round 2's
  was 149 — tighter, with validation extracted into a pure, separately tested
  `validateResume.ts`. The lazy round was bulkier but less organized.
- **Test coverage:** Round 2 has 29 passing tests (11 component + 18 validation),
  all green on the first run — including wrong-type-dropped, oversized-file, and
  empty-state cases I explicitly specified. Round 1's tests covered only what
  Claude chose to assume.
- **Edge-case reasoning:** Because I specified a worked example, Round 2 surfaced a
  real ambiguity (a valid-type-but-oversized file) and asked how to handle it,
  then checked type *before* size so a doubly-invalid file reports the type error.
  The lazy prompt never raised the question.
- **Accessibility:** Round 2 made a deliberate, defensible choice — aria attributes
  on the hidden input (the element that takes focus and is announced) rather than
  on the presentational drop zone, with keyboard access native via clipping instead
  of `display:none`. Round 1's accessibility was unspecified and unverified.

## An AI mistake / limitation I caught

Two worth naming. First, Round 2 left build artifacts (`.vite/`,
`tsconfig.tsbuildinfo`) as untracked files that would have been committed as noise;
I caught this in `git status` and added them to `.gitignore` before committing.
Second, Claude flagged its own boundary honestly: the client-side validation is
UX only, because file extension and MIME type are trivially spoofable — so any
real upload endpoint must re-validate server-side. A lazy prompt would have
shipped the client check as if it were security.

## Review effort

Round 1 felt faster to generate but would have needed real review time to trust —
I could not tell what it validated without reading it. Round 2 took longer up
front (writing the spec, approving the plan) but was faster to trust, because the
tests ran and the behavior matched my examples. The spec is where the work moves
to, and that is the work worth doing.

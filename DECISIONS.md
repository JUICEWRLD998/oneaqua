# DECISIONS

Build-window decisions and measured evidence, newest first. Prepend every entry. Never edit an old one; correct it
with a new entry. Every bullet: the measurement, the rejected alternative, the file or test that pins it.

## 2026-09-29 (P0 foundation)

- **LLM provider: OpenRouter, `google/gemini-2.5-flash`, plain `fetch`.** Owner decision. Rejected: the Anthropic
  SDK (the owner holds an OpenRouter key, not an Anthropic one, for the product). The proposer is the only LLM
  consumer and the app runs without it. Pinned by `.env.example` and `implementation.md` P4.
- **Stack: Next 15 App Router + TypeScript strict + Vitest, CSS Modules (no Tailwind), Framer Motion only.**
  Rejected: Tailwind (owner's standing preference against it).
- **Java is not installed** (`command -v java` empty), so the HL7 validator jar can't run. FHIR validation in P3
  falls back to a structural JSON check. Stated in the README's known gaps when P3 lands.
- **Deadline confirmed from the rules page: Oct 4 2026 21:00 PDT.** A third-party snippet said Oct 1; rules govern.
- **`engine/types.ts` is the contract.** `Verdicted<V>` makes a verdict without a reason a compile error
  (`reasons: [Reason, ...Reason[]]`).
- **Remote:** `origin` = `github.com/JUICEWRLD998/oneaqua`, empty at start (`git ls-remote` returned no refs).

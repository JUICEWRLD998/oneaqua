// FHIR R4 structural validation, no Java needed: the official R4 JSON schema (via ajv) + custom bundle assertions.
// This is STRUCTURAL validation. It does not check terminology, profiles or FHIRPath invariants.
// Library + CLI: `npm run validate:fhir` builds the scenario bundles, validates them, runs the planted-bad control,
// and writes evidence/fhir-validation.txt.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import Ajv from 'ajv'
import { catalogue, checkupItems, readingRuleSet } from '../engine/catalogue'
import { scenario } from '../engine/scenario'
import { diagnose, prescribe, outcome } from '../engine/index'
import { toBundle } from '../engine/fhir'
import type { FhirBundle } from '../engine/fhir'

export const SCHEMA_URL = 'https://hl7.org/fhir/R4/fhir.schema.json'
const SCHEMA_PATH = path.resolve('.tools', 'fhir.schema.json')

export async function loadSchema(): Promise<Record<string, unknown>> {
  if (!fs.existsSync(SCHEMA_PATH)) {
    const res = await fetch(SCHEMA_URL)
    if (!res.ok) throw new Error(`could not download ${SCHEMA_URL}: HTTP ${res.status}`)
    fs.mkdirSync(path.dirname(SCHEMA_PATH), { recursive: true })
    fs.writeFileSync(SCHEMA_PATH, Buffer.from(await res.arrayBuffer()))
  }
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
}

type Validator = (bundle: unknown) => string[]
let cached: Promise<Validator> | undefined

export function getValidator(): Promise<Validator> {
  cached ??= (async () => {
    const schema = await loadSchema()
    delete schema.id
    delete schema.$schema // draft-06 meta-schema is not bundled with ajv 8; the schema is otherwise draft-07 compatible
    const ajv = new Ajv({ strict: false, allErrors: false, validateFormats: false })
    const validate = ajv.compile(schema)
    return (bundle: unknown): string[] => {
      const errors: string[] = []
      if (!validate(bundle)) for (const e of validate.errors ?? []) errors.push(`schema ${e.instancePath || '/'} ${e.message}`)
      if (errors.length === 0) errors.push(...customChecks(bundle as FhirBundle))
      return errors
    }
  })()
  return cached
}

/** Every `reference` resolves within the bundle, no duplicate ids, every Condition/CarePlan/Goal subject resolves. */
export function customChecks(b: FhirBundle): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const have = new Set<string>()
  for (const e of b.entry) {
    const key = `${e.resource.resourceType}/${e.resource.id}`
    if (seen.has(key)) errors.push(`duplicate id ${key}`)
    seen.add(key)
    have.add(key)
    if (e.fullUrl && !e.fullUrl.endsWith(key)) errors.push(`fullUrl ${e.fullUrl} does not end with ${key}`)
  }
  const walk = (node: unknown, owner: string): void => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, owner))
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'reference' && typeof v === 'string' && !have.has(v)) errors.push(`${owner}: dangling reference ${v}`)
        else walk(v, owner)
      }
    }
  }
  for (const e of b.entry) {
    const r = e.resource
    walk(r, `${r.resourceType}/${r.id}`)
    if (['Condition', 'CarePlan', 'Goal'].includes(r.resourceType)) {
      const s = (r.subject as { reference?: string } | undefined)?.reference
      if (!s) errors.push(`${r.resourceType}/${r.id}: no subject`)
      else if (!have.has(s)) errors.push(`${r.resourceType}/${r.id}: subject ${s} does not resolve`)
      else if (!/^(Group|Patient)\//.test(s)) errors.push(`${r.resourceType}/${r.id}: subject ${s} is not Patient/Group (R4)`)
    }
  }
  return errors
}

export async function validateBundle(bundle: unknown): Promise<string[]> {
  return (await getValidator())(bundle)
}

// ── scenario bundles ───────────────────────────────────────────────────────────────────
export function scenarioBundle(kind: 'firstline' | 'naive'): FhirBundle {
  const dx = diagnose(catalogue, scenario.checkups.filter((c) => c.date < scenario.diagnosisCutoff), checkupItems, readingRuleSet, [])
  const plan = scenario.plans[kind]
  const outcomes =
    kind === 'firstline'
      ? [['4.2.2', 'odour'], ['4.2.2', 'clarity'], ['4.2.2', 'algae'], ['4.1.1', 'riparian-cover']].map(([m, i]) =>
          outcome(catalogue, plan, m!, i!, scenario.checkups, scenario.asOf),
        )
      : []
  return toBundle({
    catalogue,
    plan,
    assessment: prescribe(catalogue, dx, plan),
    diagnosis: dx,
    checkups: scenario.checkups,
    reaches: scenario.reaches,
    outcomes,
    exportedAt: `${scenario.asOf}T00:00:00Z`,
  })
}

async function main(): Promise<void> {
  const lines: string[] = []
  const log = (s: string): void => {
    lines.push(s)
    console.log(s)
  }
  const pkg = JSON.parse(fs.readFileSync('node_modules/ajv/package.json', 'utf8')) as { version: string }
  let failed = false
  const jarNote = fs.existsSync('evidence/fhir-jar.txt') ? fs.readFileSync('evidence/fhir-jar.txt', 'utf8').trimEnd() : 'HL7 validator jar: NOT RUN (no Java on this machine).'
  log(jarNote)
  log('')
  log('== STRUCTURAL validation (ajv + official FHIR R4 JSON schema + custom reference assertions) ==')
  log(`ajv ${pkg.version}; schema ${SCHEMA_URL} (FHIR 4.0.1); node ${process.version}`)
  log('Checks: JSON-schema conformance; every reference resolves in-bundle; no duplicate ids; Condition/CarePlan/Goal subject resolves to Group/Patient.')
  log('NOT checked: terminology, profile conformance (meta.profile), FHIRPath invariants.')
  log('Command: npm run validate:fhir')
  log('')
  for (const kind of ['firstline', 'naive'] as const) {
    const b = scenarioBundle(kind)
    const errs = await validateBundle(b)
    const counts: Record<string, number> = {}
    for (const e of b.entry) counts[e.resource.resourceType] = (counts[e.resource.resourceType] ?? 0) + 1
    log(`${kind}: ${b.entry.length} resources ${JSON.stringify(counts)} -> ${errs.length === 0 ? 'PASS, 0 errors' : 'FAIL'}`)
    for (const e of errs) log(`  ERROR ${e}`)
    if (errs.length > 0) failed = true
  }
  const bad = scenarioBundle('firstline')
  const cp = bad.entry.find((e) => e.resource.resourceType === 'CarePlan')!.resource as unknown as { subject: { reference: string } }
  cp.subject.reference = 'Group/does-not-exist'
  const badErrs = await validateBundle(bad)
  log(`planted-bad control (dangling CarePlan.subject): ${badErrs.length > 0 ? 'REJECTED as required' : 'ACCEPTED (validator is blind!)'}`)
  for (const e of badErrs) log(`  expected error: ${e}`)
  if (badErrs.length === 0) failed = true
  fs.mkdirSync('evidence', { recursive: true })
  fs.writeFileSync('evidence/fhir-validation.txt', lines.join('\n') + '\n')
  if (failed) process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

# Sources

All three are OneAquaHealth (Horizon Europe, grant 101086521) documents, CC BY 4.0. Fetched 2026-09-29.

| Source | Where | Used for |
|---|---|---|
| D2.4 Catalogue of measures for urban aquatic ecosystems rehabilitation | Zenodo record 20040211, `OAH_Catalogue of measures.pdf` | `data/d24/*` (stressors, measures, rules, casebook). Every fact carries its PRINTED page. |
| OneAquaHealth Field Sampling Protocols for Urban Stream Ecosystems | Zenodo record 20344421, DOI 10.5281/zenodo.20344421, `Field Sampling protocols OAH_zenodo_final_mjf.pdf` | `data/items/checkup-items.json` (Annex I field form labels), indicator ideas |
| Key Indicators of Ecosystem and Biological Health, Factsheets Collection | Zenodo record 20345207, DOI 10.5281/zenodo.20345207, `FactSheets_Combined_zenodo_final_mjf.pdf` | Read for reading-rule thresholds; none found, so `reading-rules.json` is `[]` |

Also checked, nothing usable: `github.com/hl7-eu/oah` (no Questionnaire resource under `input/fsh`).

## Extraction

```
node scripts/extract-d24.mjs          # downloads (if not cached), pdftotext -layout -enc UTF-8, writes data/d24/_review/
node scripts/verify-data.mjs          # shape + cites + planted-control selftest
```

Page map: the printed number in each page's running head (`D2.4 Catalogue of measures … <n>`). PDF index = printed + 2;
the title page has no head and is never cited. `data/d24/_review/` is git-ignored and regenerated on demand.

Zenodo answers 403 to a bare Node `fetch`; the extractor sends a `curl/8.0` User-Agent.

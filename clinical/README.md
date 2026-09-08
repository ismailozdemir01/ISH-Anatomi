# Clinical Intelligence Boundary

ISH-Anatomi keeps the original interactive anatomy concept and adds a clinical layer behind an explicit safety boundary.

## Target evolution

1. **Anatomy intelligence** — 2,234 real structures, systems, relations, search and AI-guided 3D inspection.
2. **Clinical anatomy** — evidence-backed anatomy explanations, pathology education, procedure-oriented anatomy and patient education.
3. **Imaging integration** — DICOM/DICOMweb ingestion and visualization for authorized clinical environments.
4. **Clinical reasoning** — validated models consume explicitly defined observations and return traceable findings/differentials.
5. **Diagnostic product** — only after prospective validation, intended-use definition, quality management, security/privacy controls and the applicable medical-device regulatory pathway are established.

## Non-negotiable rule

The current engine never fabricates a diagnosis. Missing data or an unavailable model is represented as `INSUFFICIENT_DATA` or `NOT_CONFIGURED`.

The future diagnostic engine must be a separately validated component. The general-purpose AI tutor is not itself the diagnostic model.

## Diagnostic architecture

`DICOM/PACS/EHR + symptoms + labs + vitals + clinician observations`

→ normalization / provenance

→ anatomy localization (2,234-structure knowledge graph)

→ modality-specific validated model(s)

→ evidence aggregation

→ calibrated uncertainty + differential findings

→ clinician review / audit

→ diagnosis output only when the configured model and intended-use policy permit it.

Every clinical claim must retain provenance, model/version, input identifiers, timestamp and confidence/uncertainty metadata.

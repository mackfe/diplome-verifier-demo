# Diplome — Verificador de Documentos Académicos con IA

Aplicación web construida con **Next.js** y **Google Genkit** para verificar la autenticidad de documentos académicos (diplomas y expedientes) mediante análisis con IA y Computer Vision.

**Proyecto de José Rodríguez (mackfe) — Demo pública**

## Funcionalidades

- ✅ Verificación de autenticidad de diplomas y transcripts.
- ✅ Extracción de datos con **OCR** (reconocimiento de texto).
- ✅ Detección de anomalías y manipulación con modelos de visión (Google Gemma).
- ✅ Procesamiento asíncrono con **polling** para evitar timeouts en respuestas de IA.
- ✅ Motor de puntuación (score) basado en reglas y visual cues.
- ✅ Normalización de datos, matchers y caché para optimizar llamadas a la IA.

## Arquitectura de IA

```
Frontend (Next.js) → POST /api/gemma-verify/start → { jobId }
                         ↓ (asíncrono)
                   Procesamiento en background (OCR + análisis IA)
                         ↓ (polling)
Frontend ← GET /api/gemma-verify/status?jobId → resultado
```

- **`src/lib/ocr.ts`** — Extracción de texto con OCR.
- **`src/lib/aiDeterministic.ts`** — Lógica determinista de verificación.
- **`src/lib/scoreEngine.ts`** — Motor de puntuación de autenticidad.
- **`src/lib/matchers.ts`** — Coincidencia de datos entre documentos.
- **`src/lib/visualCues.ts`** — Análisis de pistas visuales.

## Stack
Next.js · TypeScript · Google Genkit · Google Gemma · OCR · Docker

---

*Nota: repositorio demo con una selección representativa del código del motor de IA. El proyecto completo es privado.*

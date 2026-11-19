# Normas de clean code

Este documento es la referencia del agente de clean code (`.claude/agents/clean-code.md`)
y de cualquiera que escriba código en el repo, persona o agente. Se basa en una investigación
de noviembre de 2026 sobre las guías oficiales y reconocidas de cada tecnología (las fuentes
están al final) y en las convenciones que ya sigue el repo, que mandan sobre cualquier norma
externa.

## Cómo se aplica

1. **Puerta automática (CI, bloqueante).** Lo que se puede medir lo comprueban herramientas
   en cada PR, en GitHub Actions y en Jenkins: ESLint con reglas de complejidad y tamaño, jscpd (duplicados) y knip (código muerto). Se ejecuta en local con
   `npm run clean-code`.
2. **Revisión del agente (antes de abrir la PR, bloqueante).** Lo que necesita criterio
   (nombres, responsabilidades, abstracciones, efectos, tests) lo revisa el agente
   `clean-code` sobre el diff contra `main`, con la suscripción de Claude Code y sin claves de
   API. Su veredicto va en la sección «Revisión clean code» de la descripción de la PR; la CI
   falla si falta o si no dice `Veredicto: APROBADO`.
3. **Revisión completa periódica.** Cada semana, un workflow de GitHub ejecuta el informe
   completo (`npm run clean-code:informe`) y lo deja en el resumen de la ejecución de GitHub Actions y como artefacto
   `informe-clean-code`. Cuando se
   quiera, el agente hace la auditoría completa en modo `auditoria` y propone por dónde
   reducir la deuda.

### Deuda congelada

El código anterior a estas normas ya incumplía algunos umbrales. Esas infracciones están congeladas en `eslint-suppressions.json` (ESLint solo las tolera en los archivos y reglas donde ya estaban, y nunca más de las que había); el número solo puede bajar. Lo nuevo no puede
añadir deuda: una PR que necesite una excepción nueva la justifica en la descripción y el
agente decide si es aceptable.

## Puerta automática de este repo

| Comprobación | Herramienta | Umbral |
|---|---|---|
| Complejidad ciclomática | ESLint `complexity` | 15 |
| Complejidad cognitiva | `sonarjs/cognitive-complexity` | 15 |
| Anidación | `max-depth` / `max-nested-callbacks` | 4 / 4 (6 en tests) |
| Parámetros | `max-params` | 4 |
| Líneas por función | `max-lines-per-function` | 80 en `.ts`, 150 en `.tsx`, sin límite en tests |
| Líneas por archivo | `max-lines` | 400 (sin contar tests) |
| Legibilidad | `no-nested-ternary`, `no-else-return`, `no-lonely-if`, `sonarjs/*` (condiciones y funciones idénticas, `if` colapsables, booleanos invertidos) | 0 |
| React | `react-hooks/*` (incluido `exhaustive-deps` como error), `react/no-danger` | 0 |
| Tipos | `@typescript-eslint/consistent-type-imports` | 0 |
| Duplicados | `jscpd` (`.jscpd.json`), sin contar tests | 0 bloques de 70 tokens y 8 líneas |
| Código muerto | `knip` (`knip.json`) | 0 archivos, exportaciones o dependencias sin uso |

Comandos:

- `npm run clean-code`: la puerta completa, igual que en CI.
- `npm run clean-code:podar`: quita de `eslint-suppressions.json` las excepciones que ya no
  hacen falta (tras refactorizar un archivo con deuda).
- `npm run clean-code:informe`: informe completo con la deuda congelada, los duplicados
  contando los tests y el código muerto.

## Cómo leer las normas

Cada norma lleva:

- **Qué**: la regla en una frase.
- **Por qué**: el motivo, con la fuente.
- **Malo / Bueno**: ejemplo mínimo, con los nombres en español como en los repos.
- **Comprobación**: `DET` = determinista (regla concreta de herramienta) o `LLM` = necesita juicio del revisor.
- **Severidad**: `BLOQUEANTE` (no se integra) o `SUGERENCIA` (se comenta; también vale el prefijo `Nit:` de Google para
  detalles menores).

Criterio general de severidad, tomado de Google eng-practices: se aprueba un cambio cuando *mejora claramente la salud
del código*, aunque no sea perfecto; lo que no es crítico se marca como `Nit:` u opcional
(<https://google.github.io/eng-practices/review/reviewer/standard.html>,
<https://google.github.io/eng-practices/review/reviewer/comments.html>). Qué se mira en una revisión (diseño,
funcionalidad, complejidad, tests, nombres, comentarios, estilo, documentación):
<https://google.github.io/eng-practices/review/reviewer/looking-for.html>.

---

## Convenciones detectadas en los repos (prevalecen sobre las normas externas)

Leídas en `AGENTS.md`, configuración y código. El revisor **no** debe pedir que se cambien.
### Comunes

| Convención | Dónde se ve | Choque con fuente externa |
|---|---|---|
| Identificadores, comentarios, mensajes de error y nombres de test en **español**, en ASCII (sin tildes ni `ñ`: `PestanasLeccion`, `pestana`, `numero`) | todo el código | PEP 8 pide inglés *solo para la biblioteca estándar*; no aplica. Google Style Guides no exigen inglés. Sin choque real. |
| Comentarios que explican el **porqué** (seguridad, carreras, límites), no el qué | `app.py`, `useLectura.ts`, `FormularioTarea.tsx` | *Clean Code* (Martin) trata los comentarios como "fallo"; Google eng-practices pide justo comentarios de porqué. Se sigue al repo y a Google. |
| Supresiones siempre con motivo: `# noqa: BLE001 - motivo`, `// eslint-disable-next-line regla` + comentario encima | API y web | Ninguno: es lo que piden ruff (RUF100/PGH004) y `eslint-comments/require-description`. |
| Repo público: nada de rutas absolutas, emails ni textos reales; datos falsos en tests | `AGENTS.md` | — |
| Añadir dependencias exige autorización | `AGENTS.md` de ambos | Las herramientas de la puerta automática se añadieron con autorización, con versión fija. |
### Web

| Convención | Detalle |
|---|---|
| Exports **con nombre**; `export default` solo donde Next lo exige (`page`, `layout`, `loading`, `not-found`, `manifest`) | Coincide con Google TS Style ("no uses default exports"). |
| **Sin barriles** (`index.ts`): se importa el módulo concreto con alias `@/` | Mantener. |
| Archivos: componentes `PascalCase.tsx`, hooks `useAlgo.ts`, módulos de `lib/` en `kebab-case.ts` | Google TS Style pide archivos en minúsculas; **choca** → se sigue al repo. |
| Tests **junto al código** (`X.test.tsx` al lado de `X.tsx`) | Mantener. |
| `import type` / `type` en línea para tipos | Ya es el estilo; casa con `consistent-type-imports`. |
| Server Actions solo en `src/lib/acciones*.ts` con `"use server"`; reciben `unknown` y validan con guardas; devuelven unión discriminada `ResultadoAccion` (`{ ok: true, … } | { ok: false, mensaje }`) | Patrón obligado del repo. |
| Módulos con secretos importan `"server-only"`; los tests lo mockean (`vi.mock("server-only", …)`) | Mantener. |
| Tailwind 4 con **tokens propios** en `@theme inline` (`bg-fondo`, `bg-superficie`, `border-borde`, `text-texto`, `text-tenue`, `text-marca`, `text-azul-claro`, `text-rojo`, `text-verde`, `text-ambar`) | No usar la paleta por defecto (`bg-zinc-800`, `text-red-500`). |
| Clases repetidas en constantes de módulo (`const claseCampo = "…"`) o mapas `Record<Estado, string>` | Patrón aceptado; ver «Tailwind CSS 4». |
| Errores con `cause` (`new ApiNoDisponible(undefined, { cause })`) | Casa con la regla ESLint `preserve-caught-error`. |
| Prohibido `dangerouslySetInnerHTML`; nada secreto en `NEXT_PUBLIC_*` | `AGENTS.md`. |
| React Compiler **no** activado (`next.config.ts` sin `reactCompiler`) | No exigir ni prohibir `useMemo`/`useCallback` por sistema. |
| `<img>` en vez de `next/image` para medios de la API local, con `eslint-disable` justificado | Aceptado. |

## Normas generales (ambos repos)

### GEN-01 · PR pequeño y cohesionado
- **Qué**: una tarea o grupo pequeño y cohesionado por rama/PR; refactor y cambio de comportamiento, separados.
- **Por qué**: los PR pequeños se revisan mejor y antes, y se revierten con menos riesgo (<https://google.github.io/eng-practices/review/developer/small-cls.html>); además lo exige `AGENTS.md`.
- **Malo**: "feat: tareas + refactor de publicación + subir deps". **Bueno**: tres PR.
- **Comprobación**: LLM (puede ayudar un aviso por tamaño de diff, p. ej. >400 líneas sin tests ni lockfile).
- **Severidad**: SUGERENCIA (BLOQUEANTE si mezcla cambios de seguridad o dependencias no autorizadas con otra cosa).

### GEN-02 · Nombres que revelan intención, con el vocabulario del dominio
- **Qué**: nombres descriptivos en español ASCII, usando siempre el mismo término para el mismo concepto (`curso`, `leccion`, `numero`, `pieza`, `red`, `toma`, `trabajo`, `entrega`). Nada de `data`, `tmp`, `x2`, `manejar`.
- **Por qué**: *Clean Code*, cap. 2; Google TS Style §Naming (<https://google.github.io/styleguide/tsguide.html#naming>); PEP 8 (<https://peps.python.org/pep-0008/#naming-conventions>).
- **Malo**: `const d = await f(c)`. **Bueno**: `const lecciones = await obtenerLecciones(curso)`.
- **Comprobación**: LLM. Lo formal (camelCase/PascalCase/snake_case) es DET: `@typescript-eslint/naming-convention` (no recomendado: ruido alto) y ruff `N` (pep8-naming).
- **Severidad**: SUGERENCIA; BLOQUEANTE si el nombre engaña (p. ej. `esValido` que además escribe en disco).

### GEN-03 · Funciones que hacen una cosa, a un solo nivel de abstracción
- **Qué**: cada función hace una cosa; si mezcla validar, persistir y formatear, se extrae.
- **Por qué**: *Clean Code* cap. 3; *Refactoring* "Extract Function" (<https://refactoring.com/catalog/extractFunction.html>); "Long Function" (<https://refactoring.guru/smells/long-method>).
- **Malo**: un handler de 120 líneas que valida, consulta, construye la vista y maneja errores. **Bueno**: handler corto que llama a `_validar_enlace`, `crear_tarea`, `_vista_unica` (como `rutas_tareas.py`).
- **Comprobación**: DET aproximado con límites («Puerta automática»: complejidad, longitud, parámetros, anidación); el "una cosa" es LLM.
- **Severidad**: BLOQUEANTE si supera el umbral duro de CI; SUGERENCIA por debajo.

### GEN-04 · Cláusulas de guarda en lugar de anidación
- **Qué**: salir pronto (`if (!x) return …`) en vez de pirámides de `if`.
- **Por qué**: "Replace Nested Conditional with Guard Clauses" (<https://refactoring.com/catalog/replaceNestedConditionalWithGuardClauses.html>); la complejidad cognitiva penaliza la anidación (<https://www.sonarsource.com/docs/CognitiveComplexity.pdf>).
- **Malo**: `if (a) { if (b) { if (c) { … } } }`. **Bueno**: `if (!a) return; if (!b) return; …`.
- **Comprobación**: DET: ESLint `max-depth`, `sonarjs/cognitive-complexity`, `no-else-return`; ruff `PLR1702` (preview), `RET505`, `SIM102`.
- **Severidad**: según umbral («Puerta automática»).

### GEN-05 · Sin números ni cadenas mágicas repetidas; límites compartidos en un solo sitio
- **Qué**: los valores con significado (límites de longitud, rangos de días, códigos) van en constantes con nombre. Los límites que valen en web y API (p. ej. 300 caracteres de tarea, lecciones 1–999, `^[a-z0-9-]{1,40}$`) se cambian **a la vez en los dos repos**.
- **Por qué**: *Refactoring* "Replace Magic Literal" (<https://refactoring.com/catalog/replaceMagicLiteral.html>); el contrato web↔API está duplicado (`src/lib/limites.ts`, `src/lib/curso.ts` frente a `tareas.py`, `modelos.py`).
- **Malo**: `if not 1 <= len(t) <= 300` y en la web `maxLength={250}`. **Bueno**: constante con nombre en cada lado y el mismo valor.
- **Comprobación**: DET parcial: ruff `PLR2004` (ruidoso; ignora 0, 1, "", etc.); ESLint `no-magic-numbers` (desaconsejado: demasiado ruido en JSX). La coherencia entre repos es LLM.
- **Severidad**: BLOQUEANTE si un PR cambia un límite en un repo y no en el otro; SUGERENCIA en el resto.

### GEN-06 · Sin duplicación de lógica
- **Qué**: no copiar bloques de lógica; extraer función o tabla de datos. La duplicación en tests (datos de prueba explícitos) se tolera más.
- **Por qué**: DRY y "Duplicated Code" (<https://refactoring.guru/smells/duplicate-code>); Google eng-practices pide código que no sea más complejo de lo necesario.
- **Malo**: dos componentes con el mismo bloque de 15 líneas para el foco del diálogo. **Bueno**: un hook `useDialogoModal`.
- **Comprobación**: DET: `jscpd` (<https://github.com/kucherenko/jscpd>) en TS y Python; `sonarjs/no-identical-functions`, `sonarjs/no-all-duplicated-branches`, `sonarjs/no-duplicated-branches`.
- **Severidad**: BLOQUEANTE si el PR *añade* un clon por encima del umbral («Puerta automática»); SUGERENCIA para clones previos.

### GEN-07 · Sin código muerto ni comentado
- **Qué**: no dejar exports, funciones, archivos o dependencias sin uso, ni código comentado.
- **Por qué**: "Dead Code" (<https://refactoring.guru/smells/dead-code>); el control de versiones ya guarda la historia.
- **Malo**: `// const viejo = calcular(x);`. **Bueno**: borrarlo.
- **Comprobación**: DET: web `knip` (<https://knip.dev>), `@typescript-eslint/no-unused-vars` (ya activa); API `vulture` (<https://github.com/jendrikseipp/vulture>) con `--min-confidence 80` e `--ignore-decorators "@router.*,@field_validator,@model_validator"`, ruff `F401`/`F841` (ya activas), `ERA001` (código comentado).
- **Severidad**: BLOQUEANTE para variables/imports sin uso (ya lo es); SUGERENCIA para exports muertos (knip/vulture dan falsos positivos con convenciones de framework).

### GEN-08 · Comentarios: porqué, en español, actualizados
- **Qué**: comentar decisiones no evidentes (seguridad, carreras, compatibilidad), no parafrasear el código. Si el código cambia, el comentario también.
- **Por qué**: Google eng-practices "Comments" (<https://google.github.io/eng-practices/review/reviewer/looking-for.html#comments>); PEP 8 §Comments (<https://peps.python.org/pep-0008/#comments>).
- **Malo**: `// incrementa i`. **Bueno**: `// Sin /docs: cargan JS de un CDN en el mismo origen que la API.`
- **Comprobación**: LLM.
- **Severidad**: BLOQUEANTE si el comentario queda falso tras el cambio (engaña); SUGERENCIA en el resto.

### GEN-09 · Supresiones justificadas y mínimas
- **Qué**: toda supresión (`eslint-disable`, `@ts-expect-error`, `# noqa`, `# type: ignore`) es de línea, nombra la regla y explica por qué. Prohibido `@ts-ignore` y `noqa` genérico.
- **Por qué**: typescript-eslint `ban-ts-comment` (<https://typescript-eslint.io/rules/ban-ts-comment>); ruff `PGH004` (<https://docs.astral.sh/ruff/rules/blanket-noqa/>) y `RUF100` (<https://docs.astral.sh/ruff/rules/unused-noqa/>); ESLint `reportUnusedDisableDirectives` (<https://eslint.org/docs/latest/use/configure/configuration-files#reporting-unused-disable-directives>).
- **Malo**: `// eslint-disable-next-line`. **Bueno**: `// Solo al abrir el diálogo.` + `// eslint-disable-next-line react-hooks/exhaustive-deps`.
- **Comprobación**: DET: `@typescript-eslint/ban-ts-comment` (ya en recommended), `@eslint-community/eslint-comments/require-description` y `no-unlimited-disable` (dependencia nueva), `linterOptions.reportUnusedDisableDirectives: "error"`; ruff `PGH004`, `RUF100`. Que el motivo sea **válido** es LLM.
- **Severidad**: BLOQUEANTE.

### GEN-10 · Errores: no tragarlos, conservar la causa, mensajes útiles
- **Qué**: capturar solo lo esperado, traducirlo a un error del dominio conservando la causa, y no silenciar excepciones.
- **Por qué**: Google Python Style §2.4 Exceptions (<https://google.github.io/styleguide/pyguide.html#24-exceptions>); ESLint `preserve-caught-error` (<https://eslint.org/docs/latest/rules/preserve-caught-error>); ruff `B904` (<https://docs.astral.sh/ruff/rules/raise-without-from-inside-except/>).
- **Malo**: `except Exception: pass` / `catch { throw new Error("falló") }`. **Bueno**: `raise HTTPException(409, …) from error` / `throw new ApiNoDisponible(undefined, { cause })`.
- **Comprobación**: DET: ruff `BLE001`, `S110` (`try/except/pass`), `B904`, `TRY` (subconjunto), `SIM105`; ESLint `preserve-caught-error`, `@typescript-eslint/only-throw-error` (type-checked), `no-empty`. Que la captura sea la adecuada es LLM.
- **Severidad**: BLOQUEANTE (tragar errores o perder la causa); SUGERENCIA para el texto del mensaje.

### GEN-11 · Cada cambio de comportamiento trae su test
- **Qué**: todo cambio de comportamiento o bug corregido incluye un test que falla sin el cambio.
- **Por qué**: Google eng-practices "Tests" (<https://google.github.io/eng-practices/review/reviewer/looking-for.html#tests>).
- **Comprobación**: LLM (la cobertura de diff con `vitest --coverage` / `pytest-cov` + `diff-cover` sería DET, pero añade dependencias).
- **Severidad**: BLOQUEANTE para lógica nueva en `lib/`, Server Actions, rutas o validadores; SUGERENCIA para cambios puramente visuales.

---

## TypeScript, React 19 y Next.js 16 (web)

Estado actual del lint: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`, que ya incluyen
`eslint-plugin-react` recommended, **`eslint-plugin-react-hooks` 7.1.1 recommended** (con las reglas del compilador:
`set-state-in-effect`, `set-state-in-render`, `refs`, `purity`, `immutability`, `static-components`, `globals`,
`use-memo`, `preserve-manual-memoization`, `error-boundaries`, `unsupported-syntax`, `incompatible-library`, `config`,
`gating`; comprobado en `node_modules`), `jsx-a11y`, `@next/next` y `typescript-eslint` **recommended sin tipos**.
Fuentes: <https://nextjs.org/docs/app/api-reference/config/eslint>, <https://react.dev/reference/eslint-plugin-react-hooks>,
<https://typescript-eslint.io/users/configs/>.

### TypeScript

#### TS-01 · Nada de `any`; `unknown` + estrechamiento en las fronteras
- **Qué**: no usar `any`; lo que llega de fuera (JSON de la API, argumentos de Server Actions, `localStorage`) entra como `unknown` y se valida con guardas.
- **Por qué**: `any` desactiva el compilador; Google TS Style §any (<https://google.github.io/styleguide/tsguide.html#any>); narrowing (<https://www.typescriptlang.org/docs/handbook/2/narrowing.html>).
- **Malo**: `function guardar(datos: any)`. **Bueno**: `function guardar(datos: unknown) { if (!sonTextosEditables(datos)) return error; … }`.
- **Comprobación**: DET: `@typescript-eslint/no-explicit-any` (ya activa). Con tipos: `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-argument`, `no-unsafe-return`.
- **Severidad**: BLOQUEANTE.
- **Choque**: el repo hace `(await respuesta.json()) as T` en `api.ts` (lectura de la API propia, de confianza). `no-unsafe-type-assertion` lo marcaría; **no activarla**. Para datos que cruzan a escritura (Server Actions) sí exigir guardas (ya se hace).

#### TS-02 · Uniones discriminadas y `switch` exhaustivos
- **Qué**: modelar estados con uniones discriminadas (`ok: true | false`, `estado: "pendiente" | …`) y cubrir todos los casos; usar `Record<Union, …>` para tablas.
- **Por qué**: el compilador detecta el caso olvidado (<https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions>).
- **Malo**: `if (r.ok) … else r.vista` (sin estrechar). **Bueno**: `switch (estado) { … default: { const nunca: never = estado; } }` o `Record<EstadoRed["estado"], string>`.
- **Comprobación**: DET: `@typescript-eslint/switch-exhaustiveness-check` (requiere tipos).
- **Severidad**: BLOQUEANTE si deja un caso sin cubrir.

#### TS-03 · Promesas siempre esperadas, devueltas o marcadas con `void`
- **Qué**: no dejar promesas flotantes ni pasar funciones `async` donde se espera `void` sin intención.
- **Por qué**: errores no capturados y carreras (<https://typescript-eslint.io/rules/no-floating-promises>, <https://typescript-eslint.io/rules/no-misused-promises>).
- **Malo**: `cargarLecciones(curso);`. **Bueno**: `void cargarLecciones(curso);` (estilo del repo) o `await`.
- **Comprobación**: DET: `@typescript-eslint/no-floating-promises` (compatible con el `void` del repo, `ignoreVoid` por defecto), `no-misused-promises` con `checksVoidReturn: { attributes: false }` para no marcar `onClick={async () => …}`, `await-thenable`, `require-await`.
- **Severidad**: BLOQUEANTE.

#### TS-04 · Evitar `!` y aserciones `as` innecesarias
- **Qué**: no usar la aserción no nula `!` ni `as` para callar al compilador; estrechar.
- **Por qué**: Google TS Style §Type and non-nullability assertions (<https://google.github.io/styleguide/tsguide.html#type-and-non-nullability-assertions>).
- **Malo**: `dialogoRef.current!.focus()`. **Bueno**: `dialogoRef.current?.focus()`.
- **Comprobación**: DET: `@typescript-eslint/no-non-null-assertion`, `no-unnecessary-type-assertion` (tipos).
- **Severidad**: SUGERENCIA (BLOQUEANTE si oculta un `null` real).

#### TS-05 · Opcionalidad explícita y `??` en vez de `||` para valores por defecto
- **Qué**: `??` para "si es null/undefined"; `||` solo si se quiere tratar `""`/`0` como vacío.
- **Por qué**: `||` convierte `0` y `""` en el valor por defecto (<https://typescript-eslint.io/rules/prefer-nullish-coalescing>).
- **Malo**: `const hora = inicial.hora || "09:00"`. **Bueno**: `inicial.hora ?? "09:00"`.
- **Comprobación**: DET: `@typescript-eslint/prefer-nullish-coalescing`, `no-unnecessary-condition` (tipos; esta última es ruidosa → sugerencia).
- **Severidad**: SUGERENCIA.

#### TS-06 · Imports de tipos con `type`, sin barriles, alias `@/`
- **Qué**: `import type { … }` o `type` en línea; importar el módulo concreto (`@/lib/curso`), nunca crear `index.ts` de reexportación.
- **Por qué**: `verbatimModuleSyntax`/`isolatedModules` y árbol de módulos predecible; los barriles cargan módulos de más y complican el análisis de código muerto.
- **Malo**: `import { Curso } from "@/lib"`. **Bueno**: `import type { Curso } from "@/lib/tipos"`.
- **Comprobación**: DET: `@typescript-eslint/consistent-type-imports` (`fixStyle: "inline-type-imports"`), `no-restricted-imports` contra `@/lib` y `@/components` a secas; un `index.ts` nuevo se detecta con un glob en CI.
- **Severidad**: SUGERENCIA (BLOQUEANTE crear barriles, por ser contra la convención).

#### TS-07 · Exports con nombre
- **Qué**: exports con nombre salvo los archivos de Next que exigen `default`.
- **Por qué**: Google TS Style §Exports (<https://google.github.io/styleguide/tsguide.html#exports>); facilita renombrados y búsquedas.
- **Comprobación**: DET: `import/no-default-export` con excepción para `src/app/**/{page,layout,loading,not-found,error,manifest,route}.tsx?` (el plugin `import` ya viene con Next).
- **Severidad**: SUGERENCIA.

#### TS-08 · `tsconfig`: endurecer sin romper
- **Qué**: mantener `strict`. Candidatos: `noUncheckedIndexedAccess` (acceso por índice devuelve `T | undefined`), `noImplicitOverride`, `noFallthroughCasesInSwitch`. No `exactOptionalPropertyTypes` (coste alto).
- **Por qué**: <https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess>, <https://www.typescriptlang.org/tsconfig/#strict>.
- **Malo**: `const primero = enfocables[0]; primero.focus();` con lista vacía. **Bueno**: `enfocables[0]?.focus()`.
- **Comprobación**: DET (`tsc` dentro de `next build`). Ojo: `tsc` con `incremental: true` escribe `tsconfig.tsbuildinfo`.
- **Severidad**: decisión del autor; `noUncheckedIndexedAccess` puede generar bastantes errores (medir antes).

### React 19

#### RE-01 · Reglas de los hooks
- **Qué**: hooks solo en el nivel superior de componentes y hooks, nunca en condicionales, bucles ni tras un `return`.
- **Por qué**: <https://react.dev/reference/rules/rules-of-hooks>.
- **Malo**: `if (abierto) useEffect(…)`. **Bueno**: `useEffect(() => { if (!abierto) return; … }, [abierto])`.
- **Comprobación**: DET: `react-hooks/rules-of-hooks` (ya activa).
- **Severidad**: BLOQUEANTE.

#### RE-02 · Dependencias de efectos completas; `useEffectEvent` en vez de silenciar
- **Qué**: las dependencias de `useEffect` son las que lee; si un efecto debe ejecutarse "solo al abrir" pero lee valores cambiantes, la lógica no reactiva va en `useEffectEvent` (estable desde React 19.2) en lugar de `eslint-disable`.
- **Por qué**: <https://react.dev/learn/removing-effect-dependencies>, <https://react.dev/reference/react/useEffectEvent>.
- **Malo** (patrón real de `FormularioTarea.tsx`): `useEffect(() => { … onCerrar() … }, []) // eslint-disable-next-line react-hooks/exhaustive-deps`. **Bueno**: `const alEscape = useEffectEvent(() => onCerrar()); useEffect(() => { … alEscape() … }, []);`.
- **Comprobación**: DET: `react-hooks/exhaustive-deps` (hoy `warn` → subir a `error`). Que la supresión esté justificada es LLM.
- **Severidad**: BLOQUEANTE para dependencias que faltan sin supresión; SUGERENCIA para migrar las supresiones existentes a `useEffectEvent`.

#### RE-03 · No necesitas un efecto
- **Qué**: no usar `useEffect` para derivar estado de props/estado, transformar datos para pintar, reiniciar estado al cambiar una prop (usar `key`) ni reaccionar a eventos (va en el manejador). Los efectos son para sincronizar con sistemas externos (DOM, temporizadores, suscripciones).
- **Por qué**: <https://react.dev/learn/you-might-not-need-an-effect>.
- **Malo**: `useEffect(() => setTotal(items.length), [items])`. **Bueno**: `const total = items.length;`.
- **Comprobación**: DET parcial: `react-hooks/set-state-in-effect` (ya en recommended 7.x). El resto es LLM.
- **Severidad**: BLOQUEANTE si provoca renders en cascada o estado desincronizado; SUGERENCIA en el resto.

#### RE-04 · Componentes y hooks puros; nada de leer/escribir refs en render
- **Qué**: el render no muta props/estado, no llama a funciones impuras (`Date.now()`, `Math.random()`) ni lee `ref.current`; eso va en efectos o manejadores. Los valores que cambian por fotograma pueden vivir fuera de React a propósito (el `Vivo` de `useLectura.ts`), pero se tocan solo desde efectos/manejadores.
- **Por qué**: <https://react.dev/reference/rules/components-and-hooks-must-be-pure>, <https://react.dev/learn/referencing-values-with-refs>.
- **Malo**: `return <p>{contador.current}</p>`. **Bueno**: estado si se pinta; ref si no se pinta.
- **Comprobación**: DET: `react-hooks/purity`, `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/globals` (ya activas).
- **Severidad**: BLOQUEANTE.

#### RE-05 · No declarar componentes dentro de componentes
- **Qué**: los componentes se definen a nivel de módulo.
- **Por qué**: se recrean en cada render y pierden estado (<https://react.dev/learn/your-first-component#nesting-and-organizing-components>).
- **Comprobación**: DET: `react-hooks/static-components` (ya activa); `react/no-unstable-nested-components`.
- **Severidad**: BLOQUEANTE.

#### RE-06 · Estructura del estado mínima y sin duplicados
- **Qué**: no guardar lo derivable; agrupar estado que cambia junto; con muchos `useState` relacionados (≥ 6–8, como el formulario de tareas), valorar `useReducer` o un objeto de estado.
- **Por qué**: <https://react.dev/learn/choosing-the-state-structure>, <https://react.dev/learn/extracting-state-logic-into-a-reducer>.
- **Malo**: `const [cursoEnDisco, setCursoEnDisco] = useState(...)` derivado de `curso`. **Bueno**: `const cursoEnDisco = cursos.find(...)?.en_disco === true` (lo que ya hace el repo).
- **Comprobación**: LLM.
- **Severidad**: SUGERENCIA (BLOQUEANTE si hay estado duplicado que puede desincronizarse).

#### RE-07 · `key` estables
- **Qué**: listas con `key` derivada del dato (`id`, `curso-numero-pieza`), no el índice, si la lista puede reordenarse o filtrarse.
- **Por qué**: <https://react.dev/learn/rendering-lists#rules-of-keys>.
- **Comprobación**: DET: `react/jsx-key` (ya activa), `react/no-array-index-key` (opcional).
- **Severidad**: BLOQUEANTE si falta la `key`; SUGERENCIA para índice en listas estáticas.

#### RE-08 · Memoización solo con motivo medido
- **Qué**: sin React Compiler activo, `useMemo`/`useCallback`/`memo` solo cuando hay un coste medido o una identidad estable necesaria (dependencia de un efecto, prop de componente memoizado). No exigirlos por sistema.
- **Por qué**: <https://react.dev/reference/react/useMemo#should-you-add-usememo-everywhere>.
- **Comprobación**: LLM (con `react-hooks/preserve-manual-memoization` y `use-memo` ya activas para usos incorrectos).
- **Severidad**: SUGERENCIA.

#### RE-09 · Accesibilidad básica
- **Qué**: controles con nombre accesible, `label` asociado (`useId`), diálogos con foco atrapado y retorno de foco (como `FormularioTarea`), botones `type` explícito.
- **Por qué**: <https://react.dev/reference/react/useId>, WAI-ARIA APG diálogos (<https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/>).
- **Comprobación**: DET: `jsx-a11y/*` (ya activas vía Next); `react/button-has-type` (opcional). El resto, LLM.
- **Severidad**: BLOQUEANTE si un control queda inaccesible por teclado; SUGERENCIA en el resto.

#### RE-10 · Hooks personalizados para lógica con estado reutilizable
- **Qué**: extraer a `useAlgo.ts` la lógica con estado/efectos que se repite o que hace ilegible el componente (como `useLectura`, `useSesionGrabacion`).
- **Por qué**: <https://react.dev/learn/reusing-logic-with-custom-hooks>.
- **Comprobación**: LLM (apoyado por límites de longitud).
- **Severidad**: SUGERENCIA.

### Next.js 16 (App Router, Server Components, Server Actions, `cacheComponents`)

Guías oficiales (también en `node_modules/next/dist/docs/01-app/02-guides/`, que `AGENTS.md` manda consultar):
<https://nextjs.org/docs/app/guides/server-actions>, <https://nextjs.org/docs/app/guides/data-security>,
<https://nextjs.org/docs/app/getting-started/server-and-client-components>,
<https://nextjs.org/docs/app/getting-started/cache-components>,
<https://nextjs.org/docs/app/api-reference/directives/use-cache>,
<https://react.dev/reference/rsc/server-functions>, <https://react.dev/reference/rsc/use-client>.

#### NX-01 · Cada Server Action es un endpoint público
- **Qué**: todo `export` de un archivo `"use server"` es invocable desde fuera: recibe `unknown`, valida cada argumento (ids, números de lección 1–999, piezas, redes, fechas, URLs), devuelve `ResultadoAccion` y nunca filtra detalles internos.
- **Por qué**: guía de seguridad de datos y de Server Actions de Next; `AGENTS.md` (solo `src/lib/acciones*.ts` escribe).
- **Malo**: `export async function guardar(curso: string, numero: number)` sin validar. **Bueno**: `validarDestino(curso, numero, pieza, red)` antes de `escribir(...)`.
- **Comprobación**: LLM (DET parcial: `no-restricted-syntax` para impedir `"use server"` fuera de `src/lib/acciones*.ts`).
- **Severidad**: BLOQUEANTE.

#### NX-02 · Frontera servidor/cliente explícita
- **Qué**: `"use client"` lo más abajo posible (componentes hoja interactivos); páginas y layouts siguen siendo Server Components. Los módulos con secretos o `ESTUDIO_TOKEN` importan `"server-only"`. Las props que cruzan la frontera son serializables.
- **Por qué**: <https://nextjs.org/docs/app/guides/server-and-client-boundary>, <https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning>.
- **Malo**: `"use client"` en `page.tsx` para un solo botón. **Bueno**: página servidor + `<BotonAccion />` cliente.
- **Comprobación**: LLM; DET parcial: grep en CI de `process.env.(ESTUDIO_TOKEN|API_URL)` en archivos con `"use client"`; `no-restricted-imports` de `@/lib/api-escritura` desde componentes cliente.
- **Severidad**: BLOQUEANTE (secretos/fronteras); SUGERENCIA (posición de `"use client"`).

#### NX-03 · Nada secreto en `NEXT_PUBLIC_*`; sin `dangerouslySetInnerHTML`
- **Qué**: las restricciones de `AGENTS.md`.
- **Comprobación**: DET: `react/no-danger` (`error`) y los scanners del repo; `NEXT_PUBLIC_` nuevo → revisión LLM.
- **Severidad**: BLOQUEANTE.

#### NX-04 · Datos dinámicos con `cacheComponents`
- **Qué**: con `cacheComponents: true` todo acceso a datos es dinámico salvo que se cachee con `"use cache"`; las lecturas dinámicas van dentro de `<Suspense>` con un fallback útil (`loading.tsx` o `Suspense` local). Si se introduce `"use cache"`: no leer `cookies()`/`headers()`/`searchParams` dentro (se pasan como argumento), definir `cacheLife` y etiquetar con `cacheTag` para invalidar tras la mutación (`updateTag`/`revalidateTag`/`refresh`).
- **Por qué**: <https://nextjs.org/docs/app/getting-started/cache-components>, <https://nextjs.org/docs/app/api-reference/directives/use-cache>, <https://nextjs.org/docs/app/guides/how-revalidation-works>.
- **Malo**: `"use cache"` en una función que llama a `headers()`. **Bueno**: leer fuera y pasar el valor.
- **Comprobación**: DET parcial (el build de Next falla en algunos casos de acceso dinámico sin Suspense); el resto LLM.
- **Severidad**: BLOQUEANTE si sirve datos obsoletos tras una escritura o rompe el build.

#### NX-05 · `params`/`searchParams` son promesas y se validan
- **Qué**: en Next 16 `params` y `searchParams` se esperan (`await params`) y sus valores se validan (patrón de curso, número entero) antes de llamar a la API; los inválidos acaban en `notFound()`.
- **Por qué**: <https://nextjs.org/docs/app/api-reference/file-conventions/page#params-optional>; `AGENTS.md` (ids y rangos).
- **Comprobación**: TS (DET) para el `await`; la validación es LLM.
- **Severidad**: BLOQUEANTE.

#### NX-06 · Mutación → revalidar/refrescar y no paralelizar Server Actions desde el cliente
- **Qué**: tras escribir, la acción refresca la vista (`refresh()` / `revalidatePath` / `updateTag`). No usar `Promise.all` de Server Actions en el cliente: Next las despacha de una en una; si hace falta paralelismo, dentro de una sola acción.
- **Por qué**: guía de Server Actions de Next 16 ("Sequential dispatch on the client").
- **Comprobación**: LLM.
- **Severidad**: BLOQUEANTE si la UI queda desactualizada; SUGERENCIA para el `Promise.all`.

#### NX-07 · Componentes de servidor que no lanzan por fallos esperables de la API
- **Qué**: los fallos esperables (API apagada, 404) se convierten en `AvisoApi`/`notFound()` y no en una pantalla en blanco (patrón `lecturaApiOpcional`, `ApiNoDisponible`, `ErrorApi`).
- **Por qué**: README del repo; <https://nextjs.org/docs/app/getting-started/error-handling>.
- **Comprobación**: LLM.
- **Severidad**: BLOQUEANTE para lecturas nuevas sin manejo.

---

## Tailwind CSS 4 (web)

Fuentes: <https://tailwindcss.com/docs/theme>, <https://tailwindcss.com/docs/styling-with-utility-classes#managing-duplication>,
<https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values>,
<https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names>.

#### TW-01 · Solo tokens del tema propio
- **Qué**: colores con los tokens de `globals.css` (`bg-fondo`, `bg-superficie`, `border-borde`, `text-texto`, `text-tenue`, `text-marca`, `text-azul-claro`, `text-rojo`, `text-verde`, `text-ambar`, `bg-carbon`). Un color nuevo se añade como variable en `:root` + `@theme inline`, no en línea.
- **Por qué**: Tailwind 4 define el sistema de diseño con `@theme`; usar la paleta por defecto o hex sueltos rompe la coherencia.
- **Malo**: `className="bg-zinc-900 text-[#ef6b5e]"`. **Bueno**: `className="bg-fondo text-rojo"`.
- **Comprobación**: DET: grep/regex en CI sobre `className` para `(bg|text|border|ring|fill|stroke|outline)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}` y `-\[#`. (Alternativa con plugin: `eslint-plugin-better-tailwindcss` `no-unregistered-classes`, dependencia nueva.)
- **Severidad**: BLOQUEANTE para código nuevo.

#### TW-02 · Valores arbitrarios con moderación
- **Qué**: `w-[37px]` y similares solo cuando no hay escala que sirva y con motivo; si se repite, pasa a token o a utilidad de la escala.
- **Por qué**: guía de valores arbitrarios de Tailwind.
- **Comprobación**: DET (contar `-\[` en diffs) + LLM para decidir.
- **Severidad**: SUGERENCIA.

#### TW-03 · Nombres de clase completos, nunca construidos
- **Qué**: no interpolar fragmentos de clase; usar mapas completos (`CHIP: Record<Estado, string>`).
- **Por qué**: Tailwind detecta clases por texto; `bg-${color}` no se genera.
- **Malo**: `` `border-${tono}` ``. **Bueno**: `CHIP[estado]` con `"border-ambar text-ambar"`.
- **Comprobación**: DET: regex en CI para `` `[^`]*\b(bg|text|border)-\$\{ `` en `className`.
- **Severidad**: BLOQUEANTE (bug visual silencioso).

#### TW-04 · Gestionar la repetición con componentes o constantes
- **Qué**: la misma lista larga de utilidades en varios sitios se extrae a un componente o a una constante de módulo (`claseCampo`, `claseBoton`); `@apply` solo para estilos globales (`globals.css`).
- **Por qué**: "Managing duplication" de Tailwind.
- **Comprobación**: DET parcial con `jscpd` (detecta cadenas repetidas largas); LLM.
- **Severidad**: SUGERENCIA.

#### TW-05 · Estados de foco y movimiento reducido
- **Qué**: todo control interactivo mantiene `focus-visible` visible (el repo usa `focus-visible:outline-marca`); animaciones con `motion-safe:`/`motion-reduce:` cuando sean decorativas.
- **Por qué**: <https://tailwindcss.com/docs/hover-focus-and-other-states#prefers-reduced-motion>; WCAG 2.2 2.4.7.
- **Comprobación**: LLM.
- **Severidad**: SUGERENCIA (BLOQUEANTE si se quita el foco visible).

---

## Tests en la web (Vitest 5 + Testing Library)

Fuentes: <https://testing-library.com/docs/guiding-principles>, <https://testing-library.com/docs/queries/about#priority>,
<https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>, <https://vitest.dev/guide/mocking>,
<https://vitest.dev/api/vi.html#vi-mock>, <https://github.com/vitest-dev/eslint-plugin-vitest>,
<https://github.com/testing-library/eslint-plugin-testing-library>.

#### VT-01 · Probar comportamiento, no implementación
- **Qué**: consultar por rol y nombre accesible (`getByRole("button", { name: "Guardar" })`), interactuar con `userEvent`; no inspeccionar estado interno, clases CSS ni estructura del DOM.
- **Malo**: `container.querySelector(".fila > span")`. **Bueno**: `within(screen.getByRole("row", { name: /s1/ })).getByText("hecho")`.
- **Comprobación**: DET: `testing-library/prefer-screen-queries`, `no-node-access`, `no-container`, `prefer-user-event`, `prefer-presence-queries` (dependencia nueva).
- **Severidad**: SUGERENCIA (BLOQUEANTE si el test solo comprueba detalles internos y no el comportamiento).

#### VT-02 · Asincronía bien esperada
- **Qué**: `await user.click(...)`, `findBy*` para lo que aparece después, `waitFor` sin efectos secundarios dentro.
- **Comprobación**: DET: `testing-library/await-async-events`, `await-async-queries`, `no-wait-for-side-effects`, `prefer-find-by`, `no-unnecessary-act`.
- **Severidad**: BLOQUEANTE (tests intermitentes).

#### VT-03 · Sin `.only`/`.skip` ni títulos repetidos; cada test afirma algo
- **Comprobación**: DET: `vitest/no-focused-tests`, `vitest/no-disabled-tests`, `vitest/no-identical-title`, `vitest/expect-expect`, `vitest/valid-title`, `vitest/no-conditional-expect`. Sin plugin: `vitest run --allowOnly=false` (en CI ya es así por defecto con `CI=true`).
- **Severidad**: BLOQUEANTE.

#### VT-04 · Mocks en la frontera y limpios entre tests
- **Qué**: mockear solo fronteras (`next/navigation`, `server-only`, Server Actions, `fetch`), no el módulo bajo prueba; limpiar con `vi.clearAllMocks()`/`restoreAllMocks()` en `afterEach` o con `clearMocks`/`restoreMocks` en `vitest.config.ts`; temporizadores falsos siempre restaurados.
- **Por qué**: guía de mocking de Vitest.
- **Malo**: `vi.mock("@/components/acciones/PanelShorts")` en el test de `PanelShorts`. **Bueno**: `vi.mock("@/lib/acciones-estudio", …)` (como hace el repo).
- **Comprobación**: LLM (DET parcial: `vitest/prefer-hooks-on-top`, `vitest/no-mocks-import`).
- **Severidad**: BLOQUEANTE si un mock filtra estado entre tests; SUGERENCIA en el resto.

#### VT-05 · Datos de prueba ficticios y fábricas pequeñas
- **Qué**: datos inventados (`"curso-ficticio"`), fábricas como `trabajo(id, objetivo, estado)` para no repetir objetos; nada real (repo público).
- **Comprobación**: LLM + scanners de secretos del repo.
- **Severidad**: BLOQUEANTE si hay datos reales; SUGERENCIA para fábricas.

#### VT-06 · Títulos en español que describen el comportamiento
- **Qué**: `it("muestra una fila y el último trabajo de cada short")`: un comportamiento por test.
- **Comprobación**: LLM.
- **Severidad**: SUGERENCIA.

---

## Checklist del agente revisor

Formato de cada comentario: `[BLOQUEANTE]` o `[SUGERENCIA]` (o `Nit:`), norma (`RE-03`), archivo:línea, motivo en una
frase y propuesta concreta. No repetir lo que ya marca el lint de CI. No pedir cambios que contradigan las convenciones del repo.

**Bloqueantes**
1. Server Action nueva o cambiada sin validar cada argumento `unknown` o sin devolver `ResultadoAccion` (NX-01).
2. Secretos o llamadas de escritura alcanzables desde un componente cliente; módulo con secreto sin `"server-only"` (NX-02, NX-03).
3. Escritura sin refresco/revalidación de la vista afectada; `"use cache"` con APIs de petición dentro (NX-04, NX-06).
4. `params`/`searchParams` o parámetros de ruta FastAPI sin validar contra los patrones del proyecto (NX-05, FA-06).
5. Efecto que deriva estado o sincroniza estado interno (RE-03); supresión de `exhaustive-deps` sin motivo válido (RE-02, GEN-09).
6. Estado duplicado que puede desincronizarse (RE-06).
7. Modelo Pydantic de entrada sin `extra="forbid"` o con tipos laxos (PD-01); API v1 de Pydantic (PD-03).
8. `async def` con E/S bloqueante (FA-01); SQL nuevo en un handler (FA-02).
9. SQL sin parámetros, transacción compuesta sin `BEGIN IMMEDIATE`, conexión sin `closing`, cambio de esquema sin migración versionada ni test (SQ-01 a SQ-04).
10. Ruta de disco sin contención en la raíz permitida; proceso con `shell=True` o argumentos externos (PY-04, PY-05).
11. Excepciones tragadas o sin causa (GEN-10, PY-06).
12. Límite o patrón compartido cambiado en un solo repo (GEN-05).
13. Comportamiento nuevo o bug corregido sin test que lo cubra (GEN-11); test que toca `datos/` o usa datos reales (PT-01, VT-05).
14. Tests asíncronos sin `await`/`findBy` o mocks que filtran estado (VT-02, VT-04).
15. Clases Tailwind interpoladas o colores fuera de los tokens propios en código nuevo (TW-01, TW-03).
16. Comentario que queda falso tras el cambio (GEN-08); nombre engañoso (GEN-02).

**Sugerencias**
1. Función que hace varias cosas o mezcla niveles de abstracción, aunque pase el umbral (GEN-03, GEN-04).
2. Componente largo o con muchos `useState` relacionados → hook propio o `useReducer` (RE-06, RE-10).
3. Supresiones `exhaustive-deps` existentes → `useEffectEvent` (RE-02).
4. `useMemo`/`useCallback` sin motivo, o falta de ellos donde una identidad estable sí importa (RE-08).
5. Valores arbitrarios repetidos en Tailwind → token; listas de clases repetidas → constante o componente (TW-02, TW-04).
6. Restricción que podría ser `Field(...)` en vez de validador (PD-02); modelos de entrada/vista mezclados (PD-04).
7. Filas por posición en código nuevo → `sqlite3.Row` (SQ-05); restricciones `CHECK`/`STRICT` en tablas nuevas (SQ-06).
8. Tests copiados → `parametrize` o fábricas (PT-02, VT-05); `time.sleep` en tests (PT-04); consultas por rol (VT-01).
9. Docstring que falta en una función pública con contrato no obvio (PY-03).
10. `assert` usado para estrechar → `if … raise` (PY-10).
11. PR que mezcla cambios no relacionados (GEN-01).
12. Exports o archivos sin uso (GEN-07).

## Fuentes principales

- Google eng-practices (revisión): <https://google.github.io/eng-practices/review/>
- React: reglas <https://react.dev/reference/rules>, hooks <https://react.dev/reference/rules/rules-of-hooks>,
  efectos <https://react.dev/learn/you-might-not-need-an-effect>, `useEffectEvent`
  <https://react.dev/reference/react/useEffectEvent>, plugin <https://react.dev/reference/eslint-plugin-react-hooks>
- Next.js 16: <https://nextjs.org/docs/app/guides/server-actions>, <https://nextjs.org/docs/app/guides/data-security>,
  <https://nextjs.org/docs/app/getting-started/cache-components>, <https://nextjs.org/docs/app/api-reference/config/eslint>
- TypeScript: <https://www.typescriptlang.org/tsconfig/>, Google TS Style <https://google.github.io/styleguide/tsguide.html>,
  typescript-eslint <https://typescript-eslint.io/rules/>
- ESLint core: <https://eslint.org/docs/latest/rules/>; SonarJS <https://github.com/SonarSource/SonarJS/blob/master/packages/jsts/src/rules/README.md>;
  complejidad cognitiva <https://www.sonarsource.com/docs/CognitiveComplexity.pdf>
- Tailwind 4: <https://tailwindcss.com/docs/theme>, <https://tailwindcss.com/docs/styling-with-utility-classes>
- Testing Library / Vitest: <https://testing-library.com/docs/guiding-principles>, <https://vitest.dev/guide/mocking>
- Python: PEP 8, 20, 257, 484, 649, 765 (<https://peps.python.org/>), Google Python Style
  <https://google.github.io/styleguide/pyguide.html>, ruff <https://docs.astral.sh/ruff/rules/>
- FastAPI <https://fastapi.tiangolo.com/>, Pydantic <https://docs.pydantic.dev/latest/>, `sqlite3`
  <https://docs.python.org/3/library/sqlite3.html>, SQLite <https://www.sqlite.org/docs.html>, pytest <https://docs.pytest.org/en/stable/>
- *Refactoring* (Fowler) <https://refactoring.com/catalog/>; olores de código <https://refactoring.guru/refactoring/smells>;
  *Clean Code* (Martin, 2008), adaptado: sus límites de longitud ("funciones de pocas líneas") y su postura sobre
  comentarios no se adoptan literalmente.
- Herramientas: jscpd <https://github.com/kucherenko/jscpd>, knip <https://knip.dev>, vulture
  <https://github.com/jendrikseipp/vulture>, radon <https://radon.readthedocs.io/>, xenon <https://github.com/rubik/xenon>

Verificado en esta sesión: versiones instaladas (Next 16.4.6, React 19.3.0, ESLint 9.39.5, TS 5.9.3,
eslint-plugin-react-hooks 7.1.1 con las reglas del compilador en `recommended`), configuración de `eslint-config-next`
y las guías locales de Next en `node_modules/next/dist/docs/`. Las URL de documentación son las canónicas conocidas;
no se han abierto una a una por el cambio de alcance (conviene validar enlaces antes de publicar el documento).

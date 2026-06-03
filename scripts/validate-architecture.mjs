import fs from 'node:fs'
import path from 'node:path'

// Architecture/convention guard for proto-live, mirroring the sibling repos'
// validate:architecture step. Runs first in `verify` so structural drift fails
// fast (before lint/typecheck/test/build).

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))

const pkg = JSON.parse(read('package.json'))
const scripts = pkg.scripts || {}
const issues = []

// Required files (docs + tooling single-sources).
const requiredPaths = [
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/DEPLOYMENT.md',
  'docs/DEVELOPMENT.md',
  'pnpm-workspace.yaml',
  'eslint.config.mjs',
  '.prettierrc',
  'commitlint.config.cjs',
  '.husky/pre-commit',
  '.husky/commit-msg',
]
for (const file of requiredPaths) {
  if (!exists(file)) issues.push(`missing file: ${file}`)
}

// Required root scripts wired into the verify/CI chain.
const requiredScripts = [
  'dev',
  'build',
  'lint',
  'typecheck',
  'test',
  'format',
  'format:check',
  'ci',
  'verify',
  'verify:push',
  'validate:architecture',
]
for (const script of requiredScripts) {
  if (!scripts[script]) issues.push(`missing script: ${script}`)
}

// verify must run validate:architecture FIRST, before the rest (sibling convention).
if (scripts.verify && !/^pnpm run validate:architecture\b/.test(scripts.verify.trim())) {
  issues.push('script "verify" must run validate:architecture first')
}

// Engines + packageManager are the single source of the toolchain version.
if (!pkg.packageManager?.startsWith('pnpm@')) issues.push('packageManager must pin pnpm@')
if (!pkg.engines?.node) issues.push('engines.node must be set (>=22.12.0)')

// pnpm workspace members declared in pnpm-workspace.yaml must exist on disk.
if (exists('pnpm-workspace.yaml')) {
  const ws = read('pnpm-workspace.yaml')
  const globs = [...ws.matchAll(/^\s*-\s*['"]?([^'"\n]+?)['"]?\s*$/gm)]
    .map((m) => m[1].trim())
    .filter((g) => g.includes('/'))
  for (const glob of globs) {
    const base = glob.replace(/\/\*+$/, '')
    if (!exists(base)) issues.push(`workspace dir missing: ${base} (from "${glob}")`)
  }
}

// Each workspace package must declare a name + build script (monorepo -r build relies on this).
for (const dir of ['apps/api', 'apps/web']) {
  const pkgPath = `${dir}/package.json`
  if (!exists(pkgPath)) {
    issues.push(`missing ${pkgPath}`)
    continue
  }
  const wpkg = JSON.parse(read(pkgPath))
  if (!wpkg.name) issues.push(`${pkgPath}: missing "name"`)
  if (!wpkg.scripts?.build) issues.push(`${pkgPath}: missing "build" script`)
}

// React Compiler must stay wired via the standard preset (guard against regression).
if (exists('apps/web/vite.config.ts')) {
  const vite = read('apps/web/vite.config.ts')
  if (!vite.includes('reactCompilerPreset')) {
    issues.push('apps/web/vite.config.ts must wire React Compiler via reactCompilerPreset()')
  }
} else {
  issues.push('missing apps/web/vite.config.ts')
}

if (issues.length) {
  console.error('✗ architecture validation failed:')
  for (const issue of issues) console.error(`  - ${issue}`)
  process.exit(1)
}
console.log('✓ architecture validation passed')

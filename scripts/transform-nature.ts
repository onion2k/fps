#!/usr/bin/env node

import { access, mkdir, readdir, rename } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { parseArgs } from 'node:util'

type CliOptions = {
  inputDir: string
  outputDir: string
  force: boolean
  dryRun: boolean
}

type TransformTarget = {
  inputPath: string
  sourceName: string
  slug: string
  componentName: string
  outputBase: string
  outputTsxPath: string
}

const DEFAULT_INPUT = '../models/nature'
const DEFAULT_OUTPUT = './src/assets/nature'
const GLTFJSX_VERSION = '6.5.3'

const { values } = parseArgs({
  options: {
    input: { type: 'string', short: 'i', default: DEFAULT_INPUT },
    output: { type: 'string', short: 'o', default: DEFAULT_OUTPUT },
    force: { type: 'boolean', short: 'f', default: false },
    dryRun: { type: 'boolean', default: false },
  },
})

const options: CliOptions = {
  inputDir: resolve(process.cwd(), values.input ?? DEFAULT_INPUT),
  outputDir: resolve(process.cwd(), values.output ?? DEFAULT_OUTPUT),
  force: Boolean(values.force),
  dryRun: Boolean(values.dryRun),
}

void main(options)

/**
 * Orchestrates the gltfjsx transforms for all .glb files under the source directory.
 */
async function main(cliOptions: CliOptions): Promise<void> {
  await mkdir(cliOptions.outputDir, { recursive: true })

  const targets = await collectTargets(cliOptions.inputDir, cliOptions.outputDir)

  if (targets.length === 0) {
    console.warn(`No .glb files found in ${cliOptions.inputDir}`)
    return
  }

  for (const target of targets) {
    if (!cliOptions.force && (await pathExists(target.outputTsxPath))) {
      console.log(`Skipping ${target.sourceName} (use --force to regenerate)`)
      continue
    }

    logTransform(target, cliOptions)

    if (cliOptions.dryRun) {
      continue
    }

    await runGltfjsx(target)
    await renameTransformedGlb(target)
  }
}

/**
 * Builds the list of transformation targets from a directory of models.
 */
async function collectTargets(inputDir: string, outputDir: string): Promise<TransformTarget[]> {
  const entries = await readdir(inputDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.glb')
    .map((entry) => {
      const sourceName = basename(entry.name, extname(entry.name))
      const slug = toKebabCase(sourceName)
      const componentName = toPascalCase(sourceName)
      const outputBase = join(outputDir, slug)

      return {
        inputPath: resolve(inputDir, entry.name),
        sourceName,
        slug,
        componentName,
        outputBase,
        outputTsxPath: `${outputBase}.tsx`,
      }
    })
    .sort((left, right) => left.sourceName.localeCompare(right.sourceName))
}

/**
 * Executes gltfjsx with the --transform flag for a single target model.
 */
async function runGltfjsx(target: TransformTarget): Promise<void> {
  const args = [
    '--yes',
    `gltfjsx@${GLTFJSX_VERSION}`,
    target.inputPath,
    '--transform',
    '--name',
    target.componentName,
    '-o',
    target.outputBase,
  ]

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('npx', args, { stdio: 'inherit' })

    child.on('error', (error) => rejectPromise(error))
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      rejectPromise(
        new Error(
          signal
            ? `gltfjsx exited due to signal ${signal} for ${target.inputPath}`
            : `gltfjsx exited with code ${code ?? 'unknown'} for ${target.inputPath}`,
        ),
      )
    })
  })
}

/**
 * Ensures the transformed .glb uses the sanitized slug instead of the original file name.
 */
async function renameTransformedGlb(target: TransformTarget): Promise<void> {
  const outputDirectory = dirname(target.outputBase)
  const originalGlb = join(outputDirectory, `${target.sourceName}-transformed.glb`)
  const sluggedGlb = join(outputDirectory, `${target.slug}-transformed.glb`)

  if (originalGlb === sluggedGlb || !(await pathExists(originalGlb))) {
    return
  }

  await rename(originalGlb, sluggedGlb)
}

/**
 * Logs the invocation so runs are traceable in CI output.
 */
function logTransform(target: TransformTarget, cliOptions: CliOptions): void {
  const command = `npx --yes gltfjsx@${GLTFJSX_VERSION} "${target.inputPath}" --transform --name ${target.componentName} -o "${target.outputBase}"`

  if (cliOptions.dryRun) {
    console.info(`[dry-run] ${command}`)
    return
  }

  console.info(command)
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

function toKebabCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

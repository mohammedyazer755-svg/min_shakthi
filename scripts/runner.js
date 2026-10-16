#!/usr/bin/env node

/**
 * Root Command Dispatcher & Script Contract Runner
 * Implements MIN-SAKTHI V2 command contracts.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const args = process.argv.slice(2);
const command = args[0];
const restArgs = args.slice(1);

if (!command) {
  console.error('[RUNNER] Error: No command specified.');
  process.exit(1);
}

// Parse custom root contract flags like --suite=<suite>, --scope=<scope>, and --grep=<grep>
let suite = null;
let scope = null;
let grep = null;
const passthroughArgs = [];

for (let i = 0; i < restArgs.length; i++) {
  const arg = restArgs[i];
  if (arg.startsWith('--suite=')) {
    suite = arg.split('=')[1];
  } else if (arg === '--suite' && i + 1 < restArgs.length) {
    suite = restArgs[++i];
  } else if (arg.startsWith('--scope=')) {
    scope = arg.split('=')[1];
  } else if (arg === '--scope' && i + 1 < restArgs.length) {
    scope = restArgs[++i];
  } else if (arg.startsWith('--grep=')) {
    grep = arg.split('=')[1];
  } else if ((arg === '--grep' || arg === '-g') && i + 1 < restArgs.length) {
    grep = restArgs[++i];
  } else {
    passthroughArgs.push(arg);
  }
}

function run(cmd, cmdArgs, options = {}) {
  const fullCmd = [cmd, ...cmdArgs].join(' ');
  const result = spawnSync(fullCmd, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

switch (command) {
  case 'build': {
    console.log('[BUILD] Building all packages and applications in topological order...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/contracts']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/protocol']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/db']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/server']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/web']);
    console.log('[BUILD] Build complete.');
    break;
  }

  case 'build:server': {
    console.log('[BUILD] Building server and dependent packages...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/contracts']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/protocol']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/db']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/server']);
    console.log('[BUILD:SERVER] Server build complete.');
    break;
  }

  case 'build:web': {
    console.log('[BUILD] Building web client and dependent packages...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/contracts']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/web']);
    console.log('[BUILD:WEB] Web build complete.');
    break;
  }

  case 'typecheck': {
    console.log('[TYPECHECK] Ensuring dependency packages are built for types...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/contracts']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/protocol']);
    run('npm', ['run', 'build', '--workspace=@minsakthi/db']);
    console.log('[TYPECHECK] Typechecking all workspaces...');
    run('npm', ['run', 'typecheck', '--workspace=@minsakthi/contracts']);
    run('npm', ['run', 'typecheck', '--workspace=@minsakthi/protocol']);
    run('npm', ['run', 'typecheck', '--workspace=@minsakthi/db']);
    run('npm', ['run', 'typecheck', '--workspace=@minsakthi/server']);
    run('npm', ['run', 'typecheck', '--workspace=@minsakthi/web']);
    console.log('[TYPECHECK] All workspaces passed strict typecheck.');
    break;
  }

  case 'lint': {
    console.log('[LINT] Linting codebase...');
    run('npx', ['eslint', '.', '--max-warnings=0', ...passthroughArgs]);
    console.log('[LINT] Lint passed.');
    break;
  }

  case 'test:unit': {
    console.log('[TEST:UNIT] Running unit test suite with Vitest...');
    const vitestArgs = ['vitest', 'run'];

    // Support --suite and --scope filtering contracts
    const filter = suite || scope;
    if (filter) {
      console.log(`[TEST:UNIT] Filtering to suite/scope: "${filter}"`);
      vitestArgs.push(filter);
    }

    vitestArgs.push(...passthroughArgs);
    run('npx', vitestArgs);
    break;
  }

  case 'start:server': {
    console.log('[START:SERVER] Launching server production build...');
    run('node', ['apps/server/dist/index.js']);
    break;
  }

  case 'dev': {
    console.log('[DEV] Starting Vite development server on port 5173...');
    run('npm', ['run', 'dev', '--workspace=@minsakthi/web']);
    break;
  }

  case 'test:integration': {
    console.log('[TEST:INTEGRATION] Running integration test suite with Vitest...');
    const vitestArgs = ['vitest', 'run', 'tests/integration'];

    // Support --suite and --scope filtering contracts
    const filter = suite || scope;
    if (filter) {
      console.log(`[TEST:INTEGRATION] Filtering to suite/scope: "${filter}"`);
      vitestArgs.push(filter);
    }

    vitestArgs.push(...passthroughArgs);
    run('npx', vitestArgs);
    break;
  }

  case 'test:e2e': {
    console.log('[TEST:E2E] Running end-to-end test suite with Vitest...');
    const vitestArgs = ['vitest', 'run', 'tests/e2e'];
    if (grep) {
      vitestArgs.push('-t', grep);
    }
    vitestArgs.push(...passthroughArgs);
    run('npx', vitestArgs);
    break;
  }

  case 'test:visual': {
    console.log('[TEST:VISUAL] Running visual, responsive and accessibility test suite with Vitest...');
    const vitestArgs = ['vitest', 'run', 'tests/e2e/visual.spec.ts'];
    vitestArgs.push(...passthroughArgs);
    run('npx', vitestArgs);
    break;
  }

  case 'test:load': {
    console.error(
      '[CONTRACT ERROR] NOT IMPLEMENTED: test:load is scheduled for Phase 3/6 (Performance & Load Validation).'
    );
    process.exit(1);
    break;
  }

  case 'test:security': {
    console.log('[TEST:SECURITY] Running security & authorization test suite with Vitest...');
    run('npx', ['vitest', 'run', 'tests/security']);
    break;
  }

  case 'test:hardware': {
    console.error(
      '[CONTRACT ERROR] NOT IMPLEMENTED: test:hardware is scheduled for Phase 6 (Hardware Verification & Handover).'
    );
    process.exit(1);
    break;
  }

  case 'db:migrate': {
    console.log('[DB:MIGRATE] Running database migrations...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/db']);
    run('node', ['packages/db/dist/migrate.js']);
    break;
  }

  case 'db:seed:test': {
    console.log('[DB:SEED:TEST] Seeding test identities and devices...');
    run('npm', ['run', 'build', '--workspace=@minsakthi/db']);
    run('node', ['packages/db/dist/seed.js']);
    break;
  }


  default: {
    console.error(`[RUNNER] Unknown root contract command: "${command}".`);
    process.exit(1);
  }
}

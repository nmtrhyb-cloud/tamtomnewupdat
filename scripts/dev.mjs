import { build } from 'esbuild';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const outfile = '.dev-server.mjs';

async function buildAndRun() {
  try {
    await build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      packages: 'external',
      format: 'esm',
      outfile,
      sourcemap: 'inline',
      define: { 'process.env.NODE_ENV': '"development"' },
    });
  } catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
  }

  const server = spawn('node', [outfile], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  server.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      process.exit(code ?? 1);
    }
  });

  process.on('SIGTERM', () => server.kill('SIGTERM'));
  process.on('SIGINT', () => server.kill('SIGINT'));
}

buildAndRun();

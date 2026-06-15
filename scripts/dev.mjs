import { spawn } from 'child_process';

const server = spawn('node', ['--import', 'tsx/esm', 'server/index.ts'], {
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

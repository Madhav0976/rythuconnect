const { spawn } = require('child_process');

function run(name, args, color) {
  const child = spawn('npm', args, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });

  const format = (data, isError = false) => {
    const text = data.toString();
    const lines = text.split('\n');
    lines.forEach((line) => {
      if (line.length > 0) {
        const stream = isError ? process.stderr : process.stdout;
        stream.write(`${color}[${name}]\x1b[0m ${line}\n`);
      }
    });
  };

  child.stdout.on('data', (data) => format(data, false));
  child.stderr.on('data', (data) => format(data, true));

  return child;
}

console.log('\x1b[32m[RythuConnect] Starting development servers (backend & frontend)...\x1b[0m');

// Cyan for server, Magenta for web
const server = run('server', ['run', 'dev', '--workspace=server'], '\x1b[36m');
const web = run('web', ['run', 'dev', '--workspace=web'], '\x1b[35m');

function cleanup() {
  console.log('\n\x1b[32m[RythuConnect] Shutting down development servers...\x1b[0m');
  
  if (process.platform !== 'win32') {
    try {
      if (server.pid) process.kill(-server.pid, 'SIGINT');
    } catch (_) {}
    try {
      if (web.pid) process.kill(-web.pid, 'SIGINT');
    } catch (_) {}
  } else {
    try { server.kill(); } catch (_) {}
    try { web.kill(); } catch (_) {}
  }

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

server.on('close', (code) => {
  if (code && code !== 0) {
    console.log(`\x1b[36m[server]\x1b[0m Process exited with code ${code}`);
  }
});

web.on('close', (code) => {
  if (code && code !== 0) {
    console.log(`\x1b[35m[web]\x1b[0m Process exited with code ${code}`);
  }
});

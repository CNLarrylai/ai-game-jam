/* start-server.js — runs ws-server + bridge.py together */
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting WASTELAND LIVE server...');

// Start ws-server
const ws = spawn('node', ['ws-server.js'], { stdio: 'inherit', cwd: __dirname });
console.log('✅ ws-server started');

// Wait 2s then start bridge.py
setTimeout(() => {
  const bridge = spawn('python3', ['-u', 'bridge.py'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });
  console.log('✅ bridge.py started');
  
  bridge.on('exit', (code) => {
    console.log('⚠️ bridge.py exited with code', code, '— restarting in 3s');
    setTimeout(() => {
      const b2 = spawn('python3', ['-u', 'bridge.py'], { stdio: 'inherit', cwd: __dirname, env: { ...process.env } });
    }, 3000);
  });
}, 2000);

// Start phase2 engine
setTimeout(() => {
  const phase2 = spawn('python3', ['-m', 'uvicorn', 'phase2_engine:app', '--host', '0.0.0.0', '--port', '8000'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'comment_engine'),
    env: { ...process.env }
  });
  console.log('✅ phase2_engine started');
}, 3000);

process.on('SIGTERM', () => { process.exit(0); });

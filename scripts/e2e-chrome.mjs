// Runs Playwright with the installed Google Chrome (works on Windows, macOS and Linux).
import { spawn } from 'node:child_process'

const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PW_CHANNEL: 'chrome' },
})
child.on('exit', (code) => process.exit(code ?? 1))

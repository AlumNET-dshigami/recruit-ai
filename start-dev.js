const { spawn } = require("child_process");
const path = require("path");

process.chdir(__dirname);

const portArg = process.argv.find(a => a.startsWith("--port"));
const portIdx = process.argv.indexOf("--port");
const port = portArg?.split("=")[1] || (portIdx > -1 ? process.argv[portIdx + 1] : "3001");

const child = spawn("npx", ["next", "dev", "--port", port], {
  cwd: __dirname,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

#!/usr/bin/env node

import { runPlaywrightCli } from "./lib/runtime.js";

const args = process.argv.slice(2);
const exitCode = runPlaywrightCli(args);
process.exit(exitCode);

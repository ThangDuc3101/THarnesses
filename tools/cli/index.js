#!/usr/bin/env node
import { program } from "commander";
import { install } from "./install.js";
import { update } from "./update.js";
import { status } from "./status.js";

program
  .name("harness")
  .description("Personal agent harness for Claude Code")
  .version("0.1.0");

program
  .command("install")
  .description("Bootstrap harness into current project (< 5 minutes)")
  .action(install);

program
  .command("update")
  .description("Update harness files, preserve user customizations")
  .action(update);

program
  .command("status")
  .description("Check harness installation and health")
  .action(status);

program.parse();

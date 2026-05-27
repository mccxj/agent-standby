'use strict';

const path = require('path');
const { setup } = require('./core/setup');
const logger = require('./core/logger');

// Resolve the package root that ships the bundled skills/ directory.
// When running from source (local dev) __dirname is src/, so go up one level.
// When running from dist/ (ncc bundle inside node_modules) require.resolve
// locates package.json next to dist/.
// Fallback to __dirname-based resolution if require.resolve fails.
let PACKAGE_ROOT;
try {
  PACKAGE_ROOT = path.dirname(require.resolve('@mccxj/agent-standby/package.json'));
} catch {
  PACKAGE_ROOT = path.join(__dirname, '..');
}
const DEFAULT_SKILLS_PATH = path.join(PACKAGE_ROOT, 'skills');

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

async function run() {
  try {
    const args = process.argv.slice(2);
    const isCI = process.env.GITHUB_ACTIONS === 'true';

    let agentType, replaceEnv;

    if (isCI) {
      const core = require('@actions/core');
      agentType = core.getInput('agent_type') || 'opencode';
      replaceEnv = core.getInput('replace_env').toLowerCase() === 'true';
    } else {
      agentType = getArg(args, '--agent-type') || process.env.AGENT_TYPE || 'opencode';
      replaceEnv = hasFlag(args, '--replace-env');
    }

    logger.info(`Agent Standby: Setting up agent "${agentType}" with skills from "${DEFAULT_SKILLS_PATH}"`);

    const result = await setup({ agentType, skillsPath: DEFAULT_SKILLS_PATH, replaceEnv });

    if (isCI) {
      const core = require('@actions/core');
      core.setOutput('config_dir', result.configDir);
      core.setOutput('skills_dir', result.skillsDestination);
      core.setOutput('agent_type', result.agentType);
    }

  logger.info(`Config directory: ${result.configDir}`);
  logger.info(`Skills synced to: ${result.skillsDestination}`);
  if (result.agentType === 'opencode') {
    logger.info(`Opencode config: ${result.opencodeConfigDir}`);
  } else if (result.agentType === 'claude') {
    logger.info(`Claude settings: ${result.configDir}/settings.json`);
  }
    if (result.pluginsDestination) {
      logger.info(`Plugins synced to: ${result.pluginsDestination}`);
    }
    logger.info(`Environment: ${result.isCI ? 'GitHub Actions' : 'Local'}`);
    logger.info('Agent Standby setup completed successfully.');
  } catch (error) {
    logger.setFailed(`Agent Standby failed: ${error.message}`);
  }
}

run();

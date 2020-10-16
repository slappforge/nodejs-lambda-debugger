#!/usr/bin/env node
const {HELP_CMD, CMD_ARGUMENTS} = require("./lib/cmdArguments");
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const parseArgs = require('minimist');
const {startClient} = require("./lib/client");
const {printYellow, getArg, printRed} = require("./lib/util");

clear();

console.log(
    chalk.cyan(
        figlet.textSync('SLAppForge Debug Client', {font: 'Doom', horizontalLayout: 'fitted'})
    )
);

let args = parseArgs(process.argv);

if (Object.keys(args).includes(HELP_CMD.shortArg) || Object.keys(args).includes(HELP_CMD.longArg)) {
    printHelp();

} else {
    let server = getArg(args, CMD_ARGUMENTS.SERVER);
    let port = getArg(args, CMD_ARGUMENTS.PORT);
    let functionID = getArg(args, CMD_ARGUMENTS.FUNCTION);
    let authKey = getArg(args, CMD_ARGUMENTS.AUTH_KEY);
    let authSecret = getArg(args, CMD_ARGUMENTS.AUTH_SECRET);
    let verbose = getArg(args, CMD_ARGUMENTS.VERBOSE);

    if (server && port && functionID && authKey && authSecret) {
        startClient(server, port, functionID, authKey, authSecret, verbose);
    } else {
        printRed("Missing some required arguments");
        printHelp();
    }
}

function printHelp() {
    printYellow("Usage: slp-debug-client [options]\n");
    printYellow("Options:");
    Object.values(CMD_ARGUMENTS).forEach(cmdArg => {
        let line = chalk.yellow("\t", `-${cmdArg.shortArg},`, `--${cmdArg.longArg}`, '\t');
        line += (cmdArg.required) ? chalk.red('Required') : chalk.green('Optional');
        line += chalk.yellow('    ', cmdArg.description);
        if (cmdArg.defaultValue) {
            line += chalk.blue(` (Default: ${cmdArg.defaultValue})`);
        }
        console.log(line);
    });
}

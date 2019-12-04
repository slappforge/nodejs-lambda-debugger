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
    chalk.blue(
        figlet.textSync('SLAppForge Debug Client', {font: 'doom', horizontalLayout: 'fitted'})
    )
);

let args = parseArgs(process.argv);

if (Object.keys(args).includes(HELP_CMD.shortArg) || Object.keys(args).includes(HELP_CMD.longArg)) {
    printHelp();

} else {
    let server = getArg(args, CMD_ARGUMENTS.SERVER);
    let port = getArg(args, CMD_ARGUMENTS.PORT);
    let functionID = getArg(args, CMD_ARGUMENTS.FUNCTION);
    let verbose = getArg(args, CMD_ARGUMENTS.VERBOSE);

    if (server && port && functionID) {
        startClient(server, port, functionID, verbose);
    } else {
        printRed("Missing some required arguments");
        printHelp();
    }
}

function printHelp() {
    printYellow("Usage: slp-debug-client [options]\n");
    printYellow("Options:");
    Object.values(CMD_ARGUMENTS).forEach(cmdArg => {
        printYellow("\t", `-${cmdArg.shortArg},`, `--${cmdArg.longArg}`, '\t', cmdArg.description,
            cmdArg.required ? '(Required)' : '(Optional)', cmdArg.defaultValue ? `(Default: ${cmdArg.defaultValue})` : '');
    });
}

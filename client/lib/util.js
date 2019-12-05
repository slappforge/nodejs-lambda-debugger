const chalk = require('chalk');

module.exports = {
    printYellow: (message, ...optionalParams) =>
        module.exports.logWithTimestamp(chalk.yellow(message, ...optionalParams)),

    printRed: (message, ...optionalParams) =>
        module.exports.logWithTimestamp(chalk.red(message, ...optionalParams)),

    printGreen: (message, ...optionalParams) =>
        module.exports.logWithTimestamp(chalk.green(message, ...optionalParams)),

    logWithTimestamp: (message, ...optionalParams) =>
        console.log(new Date().toISOString(), message, ...optionalParams),

    getArg: (args, argConst) =>
        args[argConst.shortArg] || args[argConst.longArg] || argConst.defaultValue,

    logIfVerbose: (verbose, message, ...optionalParams) => {
        if (verbose) {
            module.exports.logWithTimestamp(chalk.blue(message, ...optionalParams))
        }
    }
};

const chalk = require('chalk');

module.exports = {
    printYellow: (message, ...optionalParams) =>
        console.log(chalk.yellow(message, ...optionalParams)),

    printRed: (message, ...optionalParams) =>
        console.log(chalk.red(message, ...optionalParams)),

    printGreen: (message, ...optionalParams) =>
        console.log(chalk.green(message, ...optionalParams)),

    printYellowWTime: (message, ...optionalParams) =>
        module.exports.printYellow(new Date().toISOString(), message, ...optionalParams),

    printRedWTime: (message, ...optionalParams) =>
        module.exports.printRed(new Date().toISOString(), message, ...optionalParams),

    printGreenWTime: (message, ...optionalParams) =>
        module.exports.printGreen(new Date().toISOString(), message, ...optionalParams),

    getArg: (args, argConst) =>
        args[argConst.shortArg] || args[argConst.longArg] || argConst.defaultValue,

    logIfVerbose: (verbose, message, ...optionalParams) => {
        if (verbose) {
            console.log(chalk.blue(new Date().toISOString(), message, ...optionalParams))
        }
    }
};

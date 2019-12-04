module.exports = {
    CMD_ARGUMENTS: {
        SERVER: {
            description: 'Host Name or IP of the debug broker server',
            shortArg: 's',
            longArg: 'server',
            required: true
        },
        PORT: {
            description: 'User connection port of the debug broker server',
            shortArg: 'p',
            longArg: 'port',
            required: false,
            defaultValue: 2939
        },
        FUNCTION: {
            description: 'Unique ID of the function',
            shortArg: 'f',
            longArg: 'func',
            required: true
        },
        VERBOSE: {
            description: 'Show verbose messages',
            shortArg: 'v',
            longArg: 'verbose',
            required: false,
            defaultValue: false
        }
    },
    HELP_CMD: {
        shortArg: 'h',
        longArg: 'help'
    }
};

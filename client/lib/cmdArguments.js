module.exports = {
    CMD_ARGUMENTS: {
        FUNCTION: {
            description: 'Unique ID of the function',
            shortArg: 'f',
            longArg: 'func',
            required: true
        },
        AUTH_KEY: {
            description: 'Authentication key received from SLAppForge Key Manager (https://www.slappforge.com/java-debug/)',
            shortArg: 'k',
            longArg: 'key',
            required: true
        },
        AUTH_SECRET: {
            description: 'Authentication secret received from SLAppForge Key Manager (https://www.slappforge.com/java-debug/)',
            shortArg: 'x',
            longArg: 'secret',
            required: true
        },
        SERVER: {
            description: 'Host Name or IP of the debug broker server',
            shortArg: 's',
            longArg: 'server',
            required: false,
            defaultValue: 'lambda-debug.slappforge.com'
        },
        PORT: {
            description: 'User connection port of the debug broker server',
            shortArg: 'p',
            longArg: 'port',
            required: false,
            defaultValue: 2939
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

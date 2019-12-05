const auth = require('basic-auth');
const axios = require('axios');

const REMOTE_AUTH_ENDPOINT = '';
const REMOTE_AUTH_HEADER_NAME = '';
const REMOTE_AUTH_HEADER_VALUE = '';

let AUTH_KEY_CACHE = {};

module.exports = {
    authenticateConnection: (request, logger, callback) => {
        let headers = request.headers;
        if (headers && headers['authorization']) {
            let {name, pass} = auth.parse(headers['authorization']);

            let success = doAuthentication(name, pass);
            if (success) {
                callback(true);
            } else {
                // Try again after loading remote keys
                module.exports.loadAuthKeysFromRemote(logger, () => {
                    callback(doAuthentication(name, pass));
                });
            }

        } else {
            logger('Authorization header not found');
            callback(false);
        }


    },
    loadAuthKeysFromRemote: (logger, callback = () => {}) => {
        if (REMOTE_AUTH_ENDPOINT) {
            logger("Loading auth keys from remote endpoint", REMOTE_AUTH_ENDPOINT);
            axios.get(REMOTE_AUTH_ENDPOINT, {
                headers: {
                    [REMOTE_AUTH_HEADER_NAME]: [REMOTE_AUTH_HEADER_VALUE]
                }
            }).then(response => {
                let data = response.data;
                AUTH_KEY_CACHE = data;
                logger('Loaded', Object.keys(data).length, 'keys from remote');
                callback();

            }).catch(e => {
                logger('Failed to load keys from remote endpoint', e);
                callback();
            });
        } else {
            callback();
        }
    }
};

function doAuthentication(key, secret) {
    let authSecret = AUTH_KEY_CACHE[key];
    return (authSecret) && (authSecret === secret);
}

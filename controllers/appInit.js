// import {existsSync, copyFileSync} from 'fs';
// import {sessionTrackerLoop} from "./sess.js";
var { tracker } = require('./tracker.js')

const appInit = () => {
    // copyBakCertsIfNoCertExists();
    // sessionTrackerLoop();
    // haLoop();
    tracker()
} 

const copyBakCertsIfNoCertExists = () => {
    const sslDir = process.env.INGRESS_DIR + '/ssl';

    const crtBakPath = sslDir + '/certs-bak/server.crt';
    const keyBakPath = sslDir + '/certs-bak/server.key';

    const crtPath = sslDir + '/certs/server.crt';
    const keyPath = sslDir + '/certs/server.key';

    const crtEx = existsSync(crtPath);
    const keyEx = existsSync(keyPath);

    const crtBakEx = existsSync(crtBakPath);
    const keyBakEx = existsSync(keyBakPath);

    // do nothing if files are in place
    if (crtEx && keyEx) return;

    // do nothing if bak files not in place
    if (!crtBakEx || !keyBakEx) return;

    copyFileSync(crtBakPath, crtPath);
    copyFileSync(keyBakPath, keyPath);
}

module.exports = appInit;
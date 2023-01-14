let {queryWhere, updatePk} = require('../db/graphql');
var fs = require('fs');
const { exec } = require('child_process');

let config = {
    hasuraAdminSecret: process.env.HASURA_ADMIN_SECRET,
    hasuraUrl:         process.env.HASURA_URL,
};

const tracker = async () => {
    setInterval(checkStillLive, 45 * 1000)
    setInterval(initializingToLiveStatus, 45 * 1000)
}

const checkStillLive = async () => {

    
    let livedSessions = await queryWhere( null, 'sessions',
        {_and: [{status: {_eq: 'live'}}]},
        ['pam_session_id', 'created_at', 'id'] 
    );
    if(livedSessions.length < 1) return;


    // let logsPath = process.env.LOGS_PATH
    let logsPath = '/Users/muhdrmv/Desktop/transparent/transparent/';
 
    fs.readFile(`${logsPath}closed_servers.json`, 'utf8', function (err, data) {
        if (err) throw err; 
        let closedServers = JSON.parse(data);

        for (const ls of livedSessions){
            let closedServersReverse = closedServers?.data?.reverse();
            for (const csr of closedServersReverse) {
                if(csr?.sessionId === ls?.pam_session_id){
                    prepareToUpdateSessions(ls, 'closed');
                    break;
                } 
            }
        }
    });    
}

const prepareToUpdateSessions = (element, status) => {

    let createdAt = new Date(element?.created_at).getTime();
    let timeNow = new Date().getTime();
    if(timeNow > (createdAt + (70 * 1000))) {
        updateSessionStatus(element, status)
    }
}

const initializingToLiveStatus = async () => {

    let initializedSessions = await queryWhere( null, 'sessions',
        {_and: [{status: {_eq: 'initializing'}}]},
        ['pam_session_id', 'created_at', 'id'] 
    );

    if(initializedSessions.length < 1) return;
 
    // Edit to LOGS_PATH
    // let logsPath = process.env.LOGS_PATH
    let logsPath = '/Users/muhdrmv/Desktop/transparent/transparent/controllers/';

    fs.readFile(`${logsPath}connected_servers.json`, 'utf8', function (err, data) {
        if (err) throw err;
        obj = JSON.parse(data);
        
        for (const element of initializedSessions) {
            if(obj.hasOwnProperty(element?.pam_session_id)){ 
                if( obj?.[element?.pam_session_id][obj?.[element?.pam_session_id].length - 1]?.position !== "logged-in"){
                    prepareToUpdateSessions(element , 'closed');
                }else{
                    updateSessionStatus(element, 'live');
                }
                break;
            }else 
                prepareToUpdateSessions(element, 'closed');
        }
    });
}
 
const updateSessionStatus = async (element, status) => {
    if(status == 'closed') {
        let test = await updatePk(config, 'sessions', element?.id, {status, closed_at: new Date().toISOString()});
        terminateTheSession(element?.pam_session_id);
    }else await updatePk(config, 'sessions', element?.id, {status});
} 

const terminateTheSession = (pam_session_id) => {

    exec(`docker rm -f ${pam_session_id}`, (err, stdout, stderr) => {

        if (err||stderr) {
          console.log(err, stderr);
          return;
        }
    });
}

module.exports = {
    tracker
}
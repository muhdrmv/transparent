var express = require('express');
var router = express.Router();
const fs = require('fs');
var rdp_prepare = require('../controllers/rdp-prepare');
const { v1 : uuidv1, v1 } = require('uuid');
const { exec } = require('child_process');

var {queryWhere, queryRaw, deleteWhere, insertOne} = require('../db/graphql');

let config = {
  hasuraAdminSecret: process.env.HASURA_ADMIN_SECRET,
  hasuraUrl:         process.env.HASURA_URL,
};

let randomIntBetween = (min,max) => {
  return Math.floor(Math.random()*(max - min + 1)) + min
} 

let check_repetitive_port = async (port) => {
  let query_repetetive_port = await queryWhere( null, 'sessions',
      {_and: [{status: {_neq: 'closed'}}, {port: {_eq: port}}]},
      ['port']
  );

  if(query_repetetive_port?.length == 0) return false;
  else true;
}

let insert_session = async (sessionInput) => {
  const session = await insertOne(config, 'sessions', sessionInput);
  if(!session){
    return;  
  }
}

router.get('/creating-session', async function(req, res, next) {

  // let {
  //   pam_session_uuid, user_id, ip, meta
  // } = req.body;
  // if(!pam_session_uuid || !user_id || !ip || !meta) return;


  let id = v1(uuidv1)
      pam_session_id  = "7b78eab6-46f6-45e6-b9b6-3bdfd2260f5b",
      user_id = "7b78eab6-46f6-45e6-b9b6-3bdfd2260f5b",
      ip = "192.168.1.130";

  let port_available = false;
  let port = null;

  while (!port_available) {
    port = randomIntBetween(10000,65535)
    let res_repetetive_port = await check_repetitive_port(port);
    if(!res_repetetive_port) port_available = true
  }

  const sessionInput = {
    id,
    pam_session_id ,
    user_id,
    ip,
    port,
    status: "initializing",
    meta: {}
  };

  insert_session(sessionInput)

  exec(`docker run -d --name ${pam_session_id} -v /root/rjpn/${process.env.TRANSPARENT_VERSION_FOLDER}/pyrdp_output:/home/pyrdp/pyrdp_output -p ${port}:3389 ${process.env.TRANSPARENT} pyrdp-mitm.py -si ${pam_session_id} ${ip}`, (err, stdout, stderr) => {
    if (err) return;
  });

  let str = await rdp_prepare(process.env.IP, port)

  let filname = `${ip}_${port}_${pam_session_id}.rdp`;

  fs.writeFile(`${process.env.RDP_CONNECTION_PATH}/${filname}`, str, (err) => {

    if (err) throw err;
    res.download(`${process.env.RDP_CONNECTION_PATH}/${filname}`)
  });

});

router.get('/terminate-session', async function(req, res, next) {

  // let {
  //   pam_session_uuid
  // } = req.body; 
  // if(!pam_session_id) return;

  let pam_session_id = "muhdrmv";

  exec(`docker rm -f ${pam_session_id}`, (err, stdout, stderr) => {

    if (err) return err;
    if(stdout != pam_session_id) return;

    // Action:  update session id (Live => closed)
  });  
});

router.get('/export-keystrokes', async function(req, res, next) {

  // let {
  //   pam_session_uuid
  // } = req.body; 
  // if(!pam_session_id) return;

  exec(`docker run -v /root/rjpn/${process.env.TRANSPARENT_VERSION_FOLDER}/pyrdp_output:/home/pyrdp/pyrdp_output ${process.env.TRANSPARENT} pyrdp-player.py --headless pyrdp_output/replays/${pam_session_id}.pyrdp`, (err, stdout, stderr) => {

    if (err) return;
    console.log(stdout);

    fs.writeFile(`${process.env.KEYSTROKES_PATH}/${pam_session_id}.txt`, stdout, (err) => {
      if (err) throw err;
      res.download(`${process.env.KEYSTROKES_PATH}/${pam_session_id}.txt`)
    });

  });

});

router.get('/export-video', async function(req, res, next) {

  // let {
  //   pam_session_uuid
  // } = req.body; 
  // if(!pam_session_id) return;

  exec(`docker run -v /root/rjpn/${process.env.TRANSPARENT_VERSION_FOLDER}/pyrdp_output:/home/pyrdp/pyrdp_output ${process.env.TRANSPARENT} pyrdp-player.py --headless pyrdp_output/replays/${pam_session_id}.pyrdp`, (err, stdout, stderr) => {

    if (err) return;
    console.log(stdout);
  });

});

module.exports = router;

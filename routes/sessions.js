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

  let id = v1(uuidv1)
      pam_session_id  = "7b78eab6-46f6-45e6-b9b6-3bdfd2260f5b",
      user_id = "7b78eab6-46f6-45e6-b9b6-3bdfd2260f5b",
      ip = "192.168.1.130";

  let port_available = false;
  let port = null;
  console.log(id);
  while (!port_available) {
    port = randomIntBetween(10000,90000)
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

  exec(`docker run -v $PWD/pyrdp_output:/home/pyrdp/pyrdp_output -p ${port}:3389 ${process.env.TRANSPARENT} pyrdp-mitm.py ${ip}`, (err, stdout, stderr) => {
    if (err) return;
  });

  let str = await rdp_prepare(ip, port)

  let filname = `${ip}_${port}_${id}.rdp`;

  fs.writeFile(`./connections/${filname}`, str, (err) => {

    if (err) throw err;
    res.download(`./connections/${filname}`)
  });

});

module.exports = router;

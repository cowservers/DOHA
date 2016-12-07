/**
 * Copyright © 2016 Jérémy L. (BlueSlime)
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See the COPYING file or http://www.wtfpl.net/
 * for more details.
 */

var fs = require('fs');
var restify = require('restify');
var request = require('request');

var low = require('lowdb');
var db = low('db.json', {
  storage: require('lowdb/lib/file-async')
});

db.defaults({ players: [] }).value();


/**
 * MCLeaks's API related
 */

function getAPIAddress(callback) {

  request({
    url: 'https://api.mcleaks.net/authenticator.php',
    json: true
  }, function (err, res, body) {

    if (err || !body.serverip) {
      console.err('Failed to retreive the MCLeaks\'s fake login server!');
      process.exit(1);

      return;
    }

    callback(body.serverip);
  });
}

function getAltStatus(target, alt, callback) {

  request({
    url: 'https://' + target + '/authenticate',
    method: 'post',
    body: {
      username: alt,
      password: randomString(12)
    },
    rejectUnhauthorized: false,
    strictSSL: false,
    json: true
  }, function (err, res, body) {

    if (err) {
      callback(err);
    }
    else if (body.error) {
      callback(body.errorMessage);
    }
    else {
      callback(null, body.availableProfiles[0].id);
    }
  });
}


/*
 * Utils
 */

 function randomString(length)
 {
    var text = "";
    var dictionnary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
      text += dictionnary.charAt(Math.floor(Math.random() * dictionnary.length));

    return text;
 }


/*
 * Bot related
 */

 getAPIAddress(function (target) {

   var server = restify.createServer();

   server.get('/api/ban/:alt', function (req, res, next) {

     if (req.params.alt.length != 16) {
       res.json({
         status: 'error',
         error: 'The ALT-Token has to be 16 chars long!'
       });
     }
     else {
       getAltStatus(target, req.params.alt, function (err, uuid) {

         if (err) {
           res.json({
             status: 'error',
             error: err
           });
         }
         else {
           var isPresent = db.get('players').find(function (o) {
             return o == uuid;
           }).value();

           if (isPresent) {
             res.json({
               status: 'error',
               error: 'This hacked account is already in the database!'
             });
           }
           else {
             db.get('players').push(uuid).value();

             console.log('Added in the database: ' + uuid + ' (ALT-Token: ' + req.params.alt + ')');

             res.json({
               status: 'ok'
             });
           }
         }
       });
     }

     next();
   });

   server.get('/api/check/:uuid', function (req, res, next) {

     var isPresent = db.get('players').find(function (o) {
       return o == req.params.uuid;
     }).value();

     res.json({
       present: (isPresent ? 'true' : 'false')
     });

     next();
   });

   server.use(restify.queryParser());

   server.listen(6450, function () {

     console.log('Target is: ' + target);
     console.log('%s listening at %s', server.name, server.url);
   });
 });

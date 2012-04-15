/*
* Copyright 2012 Marcell Suhajda, John McLear
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


// require the modules needed for the project
var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , server
  , clientIP;

server = http.createServer(function(req, res){
  var path = url.parse(req.url).pathname;
  clientIP = req.connection.remoteAddress;
  switch (path){
    case '/':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<center><h1>Welcome.</h1><><br /><h2>The current release is: 1.3 final</h2><br /><h3> Game at:<a href="/version1.3.html">this</a> page.</h3><br /><h4>Note that this is the final version, so there won\'t be any updates except for bug fixes or some small feature updates.<br />Developed by M. Suhajda and John McLear<br /><a href="http://github.com/MSuhajda">Grab the source at GitHub</a></center>');
      res.end();
      break;
    case '/version1.3.html':
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
      });
      break;
    default: send404(res);
  }
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};
server.listen(8080);

var io = io.listen(server)
  , buffer = {};
var nameTable = {};
var players = new Array();
var numberOfPlayers = 0;
var ipTable = new Array();

io.sockets.on('connection', function(client){
	// detecting multiple connections from the same IP - this is highly recommended, but remove when testing on localhost
	var isConnected = ipTable.indexOf(clientIP);
	if(isConnected == -1) {
		ipTable.push(clientIP);
	}
	// disconnect client
	else {
		client.disconnect();
	}
	
	// stores players
	players.push(client.id);

	// sends out the buffer
	client.json.send({ buffer: buffer, players: players });

	// adds the user to the nameTable
	client.on('adduser', function(username) {
	    nameTable[client.id] = username;
	    // sends to just the client
	    io.sockets.json.send({ connectVar: [nameTable[client.id], client.id] });
	    
	    // add one to the number of players
	    numberOfPlayers = numberOfPlayers+1;
	    io.sockets.json.send({ numberOfPlayers: numberOfPlayers});
	})
    
  	client.on('message', function(message){
    	var msg = { message: [client.id, message] };
   		buffer[client.id] = msg;
    	// sends to all the clients
    	io.sockets.json.send(msg);
	});
    client.on('disconnect', function(){
    	io.sockets.json.send({ disconnectVar: [nameTable[client.id], client.id] });
    	// delete the client from the nameTable
    	nameTable[client.id] = undefined;
    	// decrease the number of players with one
    	numberOfPlayers = numberOfPlayers-1;
    	// tell the client side that numberOfPlayers was updated
    	io.sockets.json.send({ numberOfPlayers: numberOfPlayers});
   		// remove the client from the playerTable
    	var index = players.indexOf(client.id);
    	players.splice(index, 1);
    	// remove the client from the ipTable
    	var index2 = ipTable.indexOf(clientIP);
    	ipTable.splice(index2, 1);
    });
});
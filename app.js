var express = require('express')
  , app = express()
  , http = require('http')
  , cors = require('cors')
  , server = http.createServer(app)
  , Iserver = require('socket.io')
  , io = Iserver(server);

app.use(cors())

const PORT = process.env.PORT || 3000;
server.listen(PORT);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['room1','room2','room3'];

var roomdata = {};

io.sockets.on('connection', function (socket) {
	
	// when the client emits 'adduser', this listens and executes
	/*socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = 'room1';
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join('room1');
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected to room1');
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
		socket.emit('updaterooms', rooms, 'room1');
	});*/
	
	socket.on('adduser', function(username,roomID){
		if(typeof usernames[username] !== 'undefined'){
			console.log("Duplicate username:"+username+", kicking..");
			var kicked =usernames[username];
			removeUser(kicked);
			kicked.disconnect(true);
		}
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = roomID;
		
		// add the client's username to the global list
		usernames[username] = socket;
		// send client to room 1
		///socket.join('room1');
		
		console.log("adduser:"+username+"->"+roomID);
		
		var createdRoom = false;
		socket.join(socket.room);
		if(typeof roomdata[socket.room] !== 'undefined'){
		}else{
			roomdata[socket.room] = {};
			roomdata[socket.room].users = [];
			createdRoom = true;
			socket.emit('createdRoom',roomID, socket.username);
			///socket.broadcast.to(roomID).emit('createdRoom',roomID, socket.username);
			console.log("Room:"+roomID+" created by:"+socket.username);
		}
		roomdata[socket.room].users.push(socket.username);
		// echo to client they've connected
		////socket.emit('updatechat', 'SERVER', 'you have connected to room1');
		// echo to room 1 that a person has connected to their room
		////socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
		////socket.emit('updaterooms', rooms, 'room1');
		
		socket.emit('userJoined', socket.username,createdRoom);
		socket.broadcast.to(roomID).emit('userJoined', socket.username,createdRoom);
	});
	
	socket.on('isFirst', function (data) {
		socket.emit('isFirst',(roomdata[socket.room].users[0]==socket.username));
	});
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});
	
	socket.on('msg', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		//io.sockets.in(socket.room).emit('msg', socket.username, data);
		io.sockets.in(socket.room).emit('msg', data, socket.username);
	});
	
	socket.on('msgTo', function (data,peerID) {
		// we tell the client to execute 'updatechat' with 2 parameters
		//io.sockets.in(socket.room).emit('msg', socket.username, data);
		
		//io.sockets.in(socket.room).emit('msg', data, socket.username);
		io.to("${"+peerID+"}").emit('msg', data, socket.username);
		///usernames[peerID].emit('msg', data, socket.username);
	});
	
	socket.on('msgOthers', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		//io.sockets.in(socket.room).emit('msg', socket.username, data);
		///io.sockets.in(socket.room).emit('msg', data, socket.username);
		socket.broadcast.emit('msg', data, socket.username);
	});
	
	socket.on('getPeers', function () {
		socket.emit('peerList',roomdata[socket.room].users);
	});
	socket.on('getPeersOfRoom', function (room) {
		/*if (roomdata[room]){
			socket.emit('roomPeerList',room,roomdata[room].users);
		}else{
			socket.emit('roomPeerList',room,[]);
		}*/
		io.of('/'+room).clients((error, clients) => {
			if (error){
				socket.emit('roomPeerList',room,[]);
				return;
			}
			//console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
			socket.emit('roomPeerList',room,clients);
		});
	});
	socket.on('whoAmI', function () {
		socket.emit('whoAmI',socket.username);
	});
	
	/*socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
		// sent message to OLD room
		socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
		// update socket session room title
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
		socket.emit('updaterooms', rooms, newroom);
	});*/
	
	function removeUser(socket){
		// remove the username from global usernames list
		delete usernames[socket.username];
		socket.broadcast.to(socket.room).emit('userLeft', socket.username);
		if(typeof roomdata[socket.room] !== 'undefined'){
			console.log("disconnect:"+socket.username+"(room:"+socket.room+")");
			if (roomdata[socket.room].users.length<=1){
				delete roomdata[socket.room];
				console.log("Room:"+socket.room+" is now empty, removing...");
			}else{
				roomdata[socket.room].users.splice(roomdata[socket.room].users.indexOf(socket.username),1);
			}
		}
		// update list of users in chat, client-side
		/*io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');*/
		socket.leave(socket.room);
	}
	

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		removeUser(socket);
	});
});

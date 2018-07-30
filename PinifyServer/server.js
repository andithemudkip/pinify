var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 3000, '0.0.0.0', function() {
    console.log('Listening to port:  ' + this.address().port);
});
let db_config = {
	host: '*************', //www.qbytegames.com
	user: '*************',
	password: '**************',
	database: '**************',
	multipleStatements: true
}
let mysql = require('mysql');
let mysql_connection;
let crypto = require('crypto');
const bcrypt = require( 'bcrypt' );
let cloudinary = require('cloudinary');

cloudinary.config({ 
	cloud_name: 'pinify', 
	api_key: '********', 
	api_secret: '********' 
})
/*
* TODO
* remove friend
*/


function handleDisconnect() {
  mysql_connection = mysql.createConnection(db_config);
  mysql_connection.connect(function(err) {
    if(err) {
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    }
  });
  mysql_connection.on('error', function(err) {
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();

var socket = require('socket.io')
var io = socket(server);

let i;
let users = [];

function QueryMysql(query,e){
	mysql_connection.query(query, function (error, results, fields) {
	  if (error) throw error;
	  e(results);
	});

}

function encrypt(text, password){
	var cipher = crypto.createCipher('aes-256-ctr',password)
	var crypted = cipher.update(text,'utf8','hex')
	crypted += cipher.final('hex');
	return crypted;
  }

function User(id,socketid,name,friends)
{
	this.id = id;
	this.name = name;
	this.socketid = socketid;
	this.friends = [];
}

io.on('connection', newConnection);

function newConnection(socket)
{
	console.log("New Connection");
	socket.on('fb_initialize_user',function(userObj)
	{
		console.log(userObj);
		if(userObj.id != ("0" || 0) && users[socket.id] == undefined) //if the user wasnt initialized yet
			{
				// let user = new User(userObj.id,socket.id,userObj.name,userObj.friends);
				console.log('User Sent Init');
				let pass = userObj.password;
				userObj.socketid = socket.id;
				delete userObj.password;
				QueryMysql(
					"SELECT password FROM qbg_pinify_users WHERE user_id = '" + userObj.id + "' LIMIT 1;",
					(pwresult)=>{
						// console.log(pwresult);
						if(pwresult.length){
							if(bcrypt.compareSync(pass,pwresult[0].password)){ //passwords match, send groups
								io.sockets.connected[socket.id].emit('user-password-correct',null);
								users[socket.id] = userObj;
								console.log('new user: ' + users[socket.id].name);
								QueryMysql(
									"SELECT user_id_1,user_id_2,status FROM qbg_pinify_friendships WHERE user_id_1 = '" + userObj.id + "' OR user_id_2 = '" + userObj.id + "'",
									(friendships)=>{
										if(friendships.length){
											for(let i = 0; i < friendships.length; i++){
												if(friendships[i].status == 1){ //accepted
													let friend_id = null;
													if(friendships[i].user_id_1 == userObj.id){
														friend_id = friendships[i].user_id_2;
													}
													else{
														friend_id = friendships[i].user_id_1;
													}
													QueryMysql(
														"SELECT user_f_name,image_url FROM qgb_pinify_users WHERE user_id = '" + friend_id + "' LIMIT 1;",
														(friend_data)=>{
															userObj.friends.push({name: friend_data[0].user_f_name, id: friend_id, image_url: friend_data[0].image_url});
															if(i == friendships.length-1){
																require('crypto').randomBytes(32, function(err, buffer) {
																	userObj.token = buffer.toString('hex');
																	users[socket.id].token = userObj.token;
																	userObj.password = pass;
																	QueryMysql(
																		"SELECT image_url FROM qbg_pinify_users WHERE user_id = '" + userObj.id + "'",
																		(user_data)=>{
																			userObj.image_url = user_data[0].image_url;
																			io.sockets.connected[socket.id].emit('facebook_initialize_user',userObj);
																		}
																	);
																});
															}
														}
													);
												} else{
													//send the friend requests
												}
											}
										}
										else{
											require('crypto').randomBytes(32, function(err, buffer) {
												userObj.token = buffer.toString('hex');
												users[socket.id].token = userObj.token;
												userObj.password = pass;
												QueryMysql(
													"SELECT image_url FROM qbg_pinify_users WHERE user_id = '" + userObj.id + "'",
													(user_data)=>{
														userObj.image_url = user_data[0].image_url;
														io.sockets.connected[socket.id].emit('facebook_initialize_user',userObj);
													}
												);
											});
										}
									}
								);
								QueryMysql( //get the names of all the groups the user is part of
									"SELECT group_id FROM qbg_pinify_memberships WHERE user_id = '" + userObj.id+"'",
									(mships)=>{
										for(let i = 0; i < mships.length; i++){
											QueryMysql(
												"SELECT * FROM qbg_pinify_groups WHERE group_id = '" + mships[i].group_id +  "' LIMIT 1;",
												(group)=>{
													SyncGroup(group,socket.id);
												}
											);
										}
									}
								);
							}
							else{//wrong password
								io.sockets.connected[socket.id].emit('user-password-incorrect',null);
							}
						}
						else{
							let phash = bcrypt.hashSync(pass, 10);
							QueryMysql(
								"INSERT INTO qbg_pinify_users (user_id,password,image_url) VALUES ('" + userObj.id + "','" + phash + "','" + userObj.image_url + "');",
								()=>{ //saved new pass
									io.sockets.connected[socket.id].emit('user-password-correct',null);
									// console.log('new user: ' + users[socket.id].name);
									require('crypto').randomBytes(32, function(err, buffer) {
										userObj.token = buffer.toString('hex');
										users[socket.id] = userObj;
										io.sockets.connected[socket.id].emit('facebook_initialize_user',userObj);
									});
									QueryMysql( //get the names of all the groups the user is part of
										"SELECT group_id FROM qbg_pinify_memberships WHERE user_id = '" + userObj.id+"'",
										(mships)=>{
											for(let i = 0; i < mships.length; i++){
												QueryMysql(
													"SELECT * FROM qbg_pinify_groups WHERE group_id = '" + mships[i].group_id +  "' LIMIT 1;",
													(group)=>{
														SyncGroup(group,socket.id);
													}
												);
											}
										}
									);
								}
							);
						}
					}
				);
			}
	});
	socket.on('add-friend', (data)=>{
		if(data.token == users[socket.id].token){
			QueryMysql(
				"SELECT user_id FROM qbg_pinify_friend_tokens WHERE token = '" + data.friend_token + "' LIMIT 1;",
				(user_ids)=>{
					if(user_ids.length){
						QueryMysql(
							"INSERT INTO qbg_pinify_friendships (user_id_1,user_id_2) SELECT * FROM(SELECT '"
							+ user_ids[0].user_id +"', '"+users[socket.id].id
							+ "') AS tmp WHERE NOT EXISTS(SELECT id FROM qbg_pinify_pin_sync WHERE user_id_1 = '"
							+ user_ids[0].user_id+"' AND user_id_2 = '" + users[socket.id].id + "') LIMIT 1;",
							()=>{
							}
						)
					}
					else{
						//token expired
					}
				}
			)
		}
	});
	socket.on('generate-friend-token',(data)=>{
		if(data.token == users[socket.id].token){
			QueryMysql(
				"SELECT token FROM qbg_pinify_friend_tokens WHERE user_id = '" + users[socket.id].id + "' LIMIT 1;",
				(token)=>{
					require('crypto').randomBytes(4, function(err, buffer) {
						let ftoken = buffer.toString('hex');
						if(token.length){
							QueryMysql(
								"UPDATE qbg_pinify_friend_tokens SET token = '" + ftoken + "' WHERE user_id = '" + users[socket.id].id + "'",
								()=>{
									//updated
								}
							);
						}
						else{
							QueryMysql(
								"INSERT INTO qbg_pinify_friend_tokens (user_id,token) VALUES ('" + users[socket.id].id + "','" + ftoken + "')",
								()=>{
									//inserted
								}
							);
						}
						io.sockets.connected[socket.id].emit('get-friend-token', ftoken);
					});
				}
			);
		}
	});
	socket.on('return-friend-token', (data)=>{
		if(data.token == users[socket.id].token){
			QueryMysql(
				"SELECT token FROM qbg_pinify_friend_tokens WHERE user_id = '" + users[socket.id].id + "' LIMIT 1;",
				(token)=>{
					if(token.length){
						io.sockets.connected[socket.id].emit('get-friend-token', token[0].token);
					}
					else{
						require('crypto').randomBytes(4, function(err, buffer) {
							let ftoken = buffer.toString('hex');
							QueryMysql(
								"INSERT INTO qbg_pinify_friend_tokens (user_id,token) VALUES ('" + users[socket.id].id + "','" + ftoken + "')",
								()=>{
									io.sockets.connected[socket.id].emit('get-friend-token', ftoken);
								}
							);
						});
					}
				}
			);
		}
	})
	socket.on('change-profile-picture', (data)=>{
		if(data.token == users[socket.id].token){
			cloudinary.uploader.upload(data.image, function(result){
				console.log(result);
				QueryMysql(
					"UPDATE qbg_pinify_users SET image_url = '" + result.url + "' WHERE user_id = '" + users[socket.id].id + "' LIMIT 1;",
					(res)=>{
						io.sockets.connected[socket.id].emit('profile-picture-changed',result.url);
					}
				);
			},{
				crop: 'scale',
				width: 128
			});
		}
		
	});
	socket.on('create-account', (data)=>{
		QueryMysql(
			"SELECT user_id FROM qbg_pinify_users WHERE user_id = '" + data.username + "'",
			(u)=>{
				if(!u.length){
					let phash = bcrypt.hashSync(data.password, 10);
					QueryMysql(
						"INSERT INTO qbg_pinify_users (user_id,password,user_f_name) VALUES ('" + data.username + "','" + phash + "','" + data.name + "')",
						()=>{
							io.sockets.connected[socket.id].emit('signup-complete', data);
						}
					);
				}
				else{
					io.sockets.connected[socket.id].emit('username-taken', null);
				}
			}
		);
	});
	socket.on('create-group', (data)=>{
		CreateGroup(data,socket);
	});
	socket.on('pinify-login',(userObj)=>{
		let pass = userObj.password;
		userObj.socketid = socket.id;
		userObj.id = userObj.username;
		delete userObj.password;
		QueryMysql(
			"SELECT password FROM qbg_pinify_users WHERE user_id = '" + userObj.username + "' LIMIT 1;",
			(pwresult)=>{
				if(pwresult.length){
					if(bcrypt.compareSync(pass,pwresult[0].password)){ //passwords match, send groups
						users[socket.id] = userObj;
						users[socket.id].id = userObj.username;
						console.log('new user: ' + users[socket.id].username);
						QueryMysql(
							"SELECT user_f_name,image_url FROM qbg_pinify_users WHERE user_id = '" + userObj.username + "'",
							(user_data)=>{
								userObj.name = user_data[0].user_f_name;
								userObj.image_url = user_data[0].image_url;
								QueryMysql(
									"SELECT user_id_1,user_id_2,status FROM qbg_pinify_friendships WHERE user_id_1 = '" + userObj.username + "' OR user_id_2 = '" + userObj.username + "'",
									(friendships)=>{
										userObj.friends = {data:[]};
										if(friendships.length){
											for(let i = 0; i < friendships.length; i++){
												if(friendships[i].status == 1){ //accepted
													let friend_id = null;
													if(friendships[i].user_id_1 == userObj.username){
														friend_id = friendships[i].user_id_2;
													}
													else{
														friend_id = friendships[i].user_id_1;
													}
													QueryMysql(
														"SELECT user_f_name,image_url FROM qgb_pinify_users WHERE user_id = '" + friend_id + "' LIMIT 1;",
														(friend_data)=>{
															userObj.friends.data.push({name: friend_data[0].user_f_name, id: friend_id, image_url: friend_data[0].image_url});
															if(i == friendships.length-1){
																require('crypto').randomBytes(32, function(err, buffer) {
																	userObj.token = buffer.toString('hex');
																	users[socket.id].token = userObj.token;
																	userObj.password = pass;
																	io.sockets.connected[socket.id].emit('pinify_initialize_user',userObj);
																});
															}
														}
													);
												} else{
													//send the friend requests
												}
											}
										}
										else{
											require('crypto').randomBytes(32, function(err, buffer) {
												userObj.token = buffer.toString('hex');
												users[socket.id].token = userObj.token;
												userObj.password = pass;
												io.sockets.connected[socket.id].emit('pinify_initialize_user',userObj);
											});
										}
									}
								);
								QueryMysql( //get the names of all the groups the user is part of
									"SELECT group_id FROM qbg_pinify_memberships WHERE user_id = '" + userObj.username+"'",
									(mships)=>{
										for(let i = 0; i < mships.length; i++){
											QueryMysql(
												"SELECT * FROM qbg_pinify_groups WHERE group_id = '" + mships[i].group_id +  "' LIMIT 1;",
												(group)=>{
													SyncGroup(group,socket.id);
												}
											);
										}
									}
								);
							}
						)
						
					}
					else{
						io.sockets.connected[socket.id].emit('user-or-pass-incorrect'); //pass
					}
				}
				else{
					io.sockets.connected[socket.id].emit('user-or-pass-incorrect'); //user
				}
			}
		);
	});
	socket.on('create-pin', (data)=>{
		QueryMysql(
			"SELECT group_id FROM qbg_pinify_groups WHERE group_id = '" + data.group_id + "' AND secret_key = '" + data.secret_key + "'",
			(valid)=>{
				if(valid.length){
					QueryMysql(
						"INSERT INTO qbg_pinify_pin_sync (pin_id,group_id,user_id) SELECT * FROM(SELECT '"
				    	+ data.pin_id +"', '"+data.group_id+"', '"+users[socket.id].id
				    	+ "') AS tmp WHERE NOT EXISTS(SELECT pin_id FROM qbg_pinify_pin_sync WHERE pin_id = '"
				    	+ data.pin_id+"' AND group_id = '" + data.group_id + "' AND user_id = '" + users[socket.id].id + "') LIMIT 1; SHOW WARNINGS;",
				    	(pin_syncs)=>{
				    		QueryMysql(
								"INSERT INTO qbg_pinify_pins (pin_id,group_id,data,date_time,creator) SELECT * FROM(SELECT '"
						    	+ data.pin_id +"', '"+data.group_id+"', '"+data.data+"', '" +  data.date_time + "', '"+users[socket.id].id
						    	+ "') AS tmp WHERE NOT EXISTS(SELECT pin_id FROM qbg_pinify_pins WHERE pin_id = '"
						    	+ data.pin_id+"' AND group_id = '" + data.group_id + "') LIMIT 1; SHOW WARNINGS;",
						    	(pins)=>{
									QueryMysql(
										"SELECT user_id FROM qbg_pinify_memberships WHERE group_id = '" + data.group_id + "';",
										(members)=>{
											let alreadySynced = 0;
											for(let i = 0; i < members.length; i++){
												for(const key of Object.keys(users)){
													if(users[key].id == members[i].user_id && users[key].socketid != socket.id){
														data.creator = users[socket.id].name;
														io.sockets.connected[users[key].socketid].emit('create-pin',data);
														alreadySynced++;
													}
												}
											}
											CheckIfEveryoneSynced(data.group_id,data,alreadySynced);
										}
									);
								}
							);
				    	}
					);
				}
			}
		)
		
	});
	socket.on('add-member-to-group',function(data){
		QueryMysql(
			"SELECT * FROM qbg_pinify_groups WHERE group_id = '" + data.group_id + "' AND secret_key = '" + data.secret_key + "'",
			(group)=>{
				if(group){
					QueryMysql( //insert into memberships
						"INSERT INTO qbg_pinify_memberships (group_id,user_id,user_f_name) SELECT * FROM(SELECT '"
						+ data.group_id +"', '"+data.user_id+"', '" + data.user_name + "') AS tmp WHERE NOT EXISTS(SELECT group_id FROM qbg_pinify_memberships WHERE group_id = '"
						+ data.group_id+"' AND user_id = '" + +data.user_id + "') LIMIT 1;",
						(d)=>{
							for(const key of Object.keys(users)){
								if(users[key].id == data.user_id){
									SyncGroup(group,users[key].socketid);
								}
							}
						}
					);
				}
				else{
					console.log('invalid secret key in add member');
				}
			}
		);
	});
	socket.on('sync-group',(group)=>{
		SyncGroup([group], socket.id);
	});
	socket.on('leave-group',(group)=>{
		RemoveUserFromGroup(users[socket.id],group);
	});
	socket.on('disconnect',function(){
		delete users[socket.id];
	});
	
}
function RemoveUserFromGroup(user,group){
	if(user && group){
		QueryMysql( //remove the member from the group
			"DELETE FROM qbg_pinify_memberships WHERE user_id = '" + user.id + "' AND group_id = '" + group.id + "' LIMIT 1;",
			(d)=>{
				QueryMysql( //check how many members the group has now
					"SELECT * FROM qbg_pinify_memberships WHERE group_id = '" + group.id + "'",
					(mships)=>{
						// console.log(mships);
						if(!mships.length){ //if there are no members
							QueryMysql( //delete it
								"DELETE FROM qbg_pinify_groups WHERE group_id = '" + group.id + "'",
								()=>{
									//deleted group with 0 members
									console.log('deleted group with 0 members');
								}
							);
						}
					}
				);
			}
		);
	}
	
}
function SyncGroup(group, socketid){
	group = group[0];
	let group_image_url = group.image_url;
	QueryMysql(
		"SELECT * FROM qbg_pinify_groups WHERE group_id = '" + group.group_id + "' AND secret_key = '" + group.secret_key + "' LIMIT 1;",
		(group)=>{
			if(group.length){
				let t_group = group[0];
				// console.log(t_group);
				let gr_id = group[0].group_id;
				QueryMysql( //get the pins inside that group
					"SELECT * FROM qbg_pinify_pins WHERE group_id = '" + gr_id + "'",
					(pins)=>{
						t_group.pins = [];
						if(pins.length){
							for(let j = 0; j < pins.length; j++){
								QueryMysql(
									"SELECT * FROM qbg_pinify_pin_sync WHERE pin_id = '" + pins[j].pin_id+"' AND group_id = '" + gr_id + "' AND user_id = '" + users[socketid].id + "' LIMIT 1;",
									(pin_syncs)=>{
										if(!pin_syncs.length){
											t_group.pins.push(pins[j]);
											QueryMysql(
												"INSERT INTO qbg_pinify_pin_sync (pin_id,group_id,user_id) SELECT * FROM(SELECT '"
												+ pins[j].pin_id +"', '"+gr_id+"', '"+users[socketid].id
												+ "') AS tmp WHERE NOT EXISTS(SELECT pin_id FROM qbg_pinify_pin_sync WHERE pin_id = '"
												+ pins[j].pin_id+"' AND group_id = '" + gr_id + "' AND user_id = '" + users[socketid].id + "') LIMIT 1;",
												(f)=>{ //check if everyone is synced
													CheckIfEveryoneSynced(gr_id, pins[j]);
												}
											);
										}
										if(j == pins.length-1){
											QueryMysql(
												"SELECT user_id,user_f_name FROM qbg_pinify_memberships WHERE group_id = '" + gr_id + "'",
												(members)=>{
													for(let i = 0; i < members.length; i++){
														QueryMysql(
															"SELECT image_url FROM qbg_pinify_users WHERE user_id = '" + members[i].user_id + "'",
															(image_url)=>{
																// console.log(image_url);
																members[i].image_url = image_url[0];
																if(i == members.length-1){
																	t_group.members = members;
																	if(group_image_url)
																		t_group.image_url = group_image_url;
																	// console.log(t_group);
																	io.sockets.connected[socketid].emit('sync_group',t_group);
																}
															}
														);
													}
												}
											);
										}
									}
								);
							}
						}
						else{
							QueryMysql(
								"SELECT user_id,user_f_name FROM qbg_pinify_memberships WHERE group_id = '" + gr_id + "'",
								(members)=>{
									for(let i = 0; i < members.length; i++){
										QueryMysql(
											"SELECT image_url FROM qbg_pinify_users WHERE user_id = '" + members[i].user_id + "'",
											(image_url)=>{
												// console.log(image_url);
												members[i].image_url = image_url[0];
												if(i == members.length-1){
													t_group.members = members;
													if(group_image_url)
														t_group.image_url = group_image_url;
													// console.log(t_group);
													io.sockets.connected[socketid].emit('sync_group',t_group);
												}
											}
										);
									}
								}
							);
						}
						
						// t_group.pins = pins;
						
						
					}
				);
			}
		}
	);
}
function CheckIfEveryoneSynced(gr_id, pin, alreadySynced = 0){
	QueryMysql(
		"SELECT id FROM qbg_pinify_pin_sync WHERE group_id = '" + gr_id + "' AND pin_id = '" + pin.pin_id + "';",
		(countOfPinSyncs)=>{
			QueryMysql(
				"SELECT id FROM qbg_pinify_memberships WHERE group_id = '" + gr_id + "';",
				(countOfMembers)=>{
					if(countOfPinSyncs.length + alreadySynced >= countOfMembers.length){
						QueryMysql(
							"DELETE FROM qbg_pinify_pins WHERE pin_id = '" + pin.pin_id + "';",
							(data)=>{
								// console.log('deleted from pins');
							}
						);
						QueryMysql(
							"DELETE FROM qbg_pinify_pin_sync WHERE pin_id = '" + pin.pin_id + "';",
							(data)=>{
								// console.log('deleted from pin_sync');
							}
						);
					}
				}
			);
		}
	);
}
function SendToUserById(id,action,data){
	console.log(id + '; ' + action + '; ' + data);
	for(const key of Object.keys(users)){
		if(users[key].id == id){
			console.log(io.sockets.connected[users[key].socketid]);
			io.sockets.connected[users[key].socketid].emit(action,data);
		}
	}
}
function CreateGroup(g,socket){
	let groupObj = g;
	let user = users[socket.id];
	if(!groupObj.id){ //its a new group [doesnt have an id], give it an id
		let group_id = groupObj.name.replace(" ", "-").toLowerCase() + '_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		group_id = group_id.replace(/[^a-z0-9]/gi,'');
		groupObj.id = group_id;
	}
	groupObj.is_encrypted = 0;
	groupObj.password_verify = '';
	if(groupObj.image){
		cloudinary.uploader.upload(groupObj.image, function(result){
			console.log(result);
			require('crypto').randomBytes(32, function(err, buffer) {
				groupObj.secret_key = buffer.toString('hex');
				groupObj.image_url = result.url;
				if(groupObj.password.length){
					groupObj.is_encrypted = 1;
					groupObj.password_verify = encrypt(groupObj.secret_key,groupObj.password);
				}
				QueryMysql( //insert into groups
					"INSERT INTO qbg_pinify_groups (group_id,name,secret_key,color,is_encrypted,password_verify,image_url) SELECT * FROM(SELECT '"
					+ groupObj.id +"', '"+groupObj.name+"', '"+groupObj.secret_key+"', '"+groupObj.color+"', "+groupObj.is_encrypted.toString() + ", '" + groupObj.password_verify + "', '" + groupObj.image_url
					 + "') AS tmp WHERE NOT EXISTS(SELECT group_id FROM qbg_pinify_groups WHERE group_id = "
					+ groupObj.id+") LIMIT 1;",
					(data)=>{
						QueryMysql( //insert into memberships
							"INSERT INTO qbg_pinify_memberships (group_id,user_id,user_f_name) SELECT * FROM(SELECT '"
							+ groupObj.id +"', '"+user.id+"', '" + user.name + "') AS tmp WHERE NOT EXISTS(SELECT group_id FROM qbg_pinify_memberships WHERE group_id = '"
							+ groupObj.id+"' AND user_id = '" + user.id + "') LIMIT 1;",
							(data)=>{
								groupObj.group_id = groupObj.id;
								SyncGroup([groupObj], socket.id);
							}
						);
					}
				);
			});
		}, {
			crop: 'scale',
			width: 128
		});
	}
	else{
		require('crypto').randomBytes(32, function(err, buffer) {
			groupObj.secret_key = buffer.toString('hex');
			groupObj.image_url = 'https://res.cloudinary.com/pinify/image/upload/v1530888267/missing_group_icon.png'
			if(groupObj.password.length){
				groupObj.is_encrypted = 1;
				groupObj.password_verify = encrypt(groupObj.secret_key,groupObj.password);
			}
			QueryMysql( //insert into groups
				"INSERT INTO qbg_pinify_groups (group_id,name,secret_key,color,is_encrypted,password_verify,image_url) SELECT * FROM(SELECT '"
				+ groupObj.id +"', '"+groupObj.name+"', '"+groupObj.secret_key+"', '"+groupObj.color+"', "+groupObj.is_encrypted.toString() + ", '" + groupObj.password_verify + "', '" + groupObj.image_url
				 + "') AS tmp WHERE NOT EXISTS(SELECT group_id FROM qbg_pinify_groups WHERE group_id = "
				+ groupObj.id+") LIMIT 1;",
				(data)=>{
					QueryMysql( //insert into memberships
						"INSERT INTO qbg_pinify_memberships (group_id,user_id,user_f_name) SELECT * FROM(SELECT '"
						+ groupObj.id +"', '"+user.id+"', '" + user.name + "') AS tmp WHERE NOT EXISTS(SELECT group_id FROM qbg_pinify_memberships WHERE group_id = '"
						+ groupObj.id+"' AND user_id = '" + user.id + "') LIMIT 1;",
						(data)=>{
							groupObj.group_id = groupObj.id;
							SyncGroup([groupObj], socket.id);
						}
					);
				}
			);
		});
	}

}


console.log("Server Running");

process.stdin.resume();
function exitHandler(options, err) {
    // if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
    mysql_connection.end();
}
// //do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
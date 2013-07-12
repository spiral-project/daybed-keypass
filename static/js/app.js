//var DAYBED_SERVICE = 'http://localhost/daybed';
var DAYBED_SERVICE = 'http://127.0.0.1/daybed';

var STORAGE_INDEX = "collections";
var FILE_AUTOCLOSE_TIMEOUT = 10000;  // 30 seconds

var last_event = new Date().getTime();

var __password = '';
var __current_collection = '';
var __enter_password_callback;
var __last_remove = '';
var __sync_callback;

var collection_template = '';
var service_template = '';


// UUID management
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function uuid4() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

// Synchronisation management
function sync_from_daybed() {
	email = $('#daybed-email').val();
	$('#daybed-email').val('');

	password = $('#daybed-password').val();
	$('#daybed-password').val('');

	if(email.indexOf('@') == -1 || email.indexOf('.') == -1) {
		alert('Wrong email adress');
		refresh_list();
		return false;
	}

	passphrase = password + email;
	daybed_id = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(JSON.stringify(passphrase)));

	// Get collections from daybed
	$.get(DAYBED_SERVICE + '/data/keypass_' + daybed_id, function(data) {
		collections = {};
		for(var key in data.data){
			collections[data.data[key]['uuid']] = data.data[key];
		}
		set_collections(collections);
	}).fail(function(){ 
		set_collections({});
	});
}

function push_to_daybed(url) {
	collections = get_collections();
	for(var key in collections) {
		var data = collections[key];
		$.ajax({
			type: 'PUT', 
			url: url+'/'+data.uuid, 
			contentType: "application/json",
			data: JSON.stringify(data)})
			.done(function() {
				console.log('Pushed succeed for '+data.name);
			}).fail(function() {
				alert('Push failed on '+data.name)
			});
	}
}

function remove_from_daybed(url) {
	// All the collections that are on daybed but no more on
	// localStorage must die
	var local_storage_ids = [];
	collections = get_collections();
	for(var key in collections) {
		local_storage_ids.push(key);
	}
	// Get the collections list
	$.get(url, function(data) {
		var to_remove_from_daybed = []
		for(var key in data.data){
			uuid = data.data[key]['uuid'];
			if(local_storage_ids.indexOf(uuid) == -1) {
				$.ajax({
					type: 'DELETE',
					url: url+'/'+uuid})
					.done(function() {
						console.log('Deleted ' + uuid);
					}).fail(function() {
						alert('Fail to delete '+uuid)
					});
			}
		}
	});	
}

function sync_to_daybed() {
	var email = $('#daybed-email').val();
	$('#daybed-email').val('');

	var password = $('#daybed-password').val();
	$('#daybed-password').val('');

	if(email.indexOf('@') == -1 || email.indexOf('.') == -1) {
		alert('Wrong email adress');
		refresh_list();
		return false;
	}

	passphrase = password + email;
	var daybed_id = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(JSON.stringify(passphrase)));

	// Check if the definition already exists
	try {
    	$.get(DAYBED_SERVICE + '/definitions/keypass_' + daybed_id)
    		.done(function(data) {
    			// If yes, post all the collections to daybed
    			remove_from_daybed(DAYBED_SERVICE + '/data/keypass_' + daybed_id);
    			push_to_daybed(DAYBED_SERVICE + '/data/keypass_' + daybed_id);
    		}).fail(function(){
    			// We need to create the model first
				create_daybed_model_and_sync(DAYBED_SERVICE + '/definitions/keypass_' + daybed_id);
    		});
	} catch (err) {
		console.log('It could be a CORS problem on 404.');
		create_daybed_model_and_sync(DAYBED_SERVICE + '/definitions/keypass_' + daybed_id);
	}
}

function create_daybed_model_and_sync(url) {
	definition = {title: "Daybed-Keypass",
				  description: "User account synchronization keypass",
				  fields: [{name: 'uuid',
							type: 'string',
							description: 'uuid of the collection'},
						   {name: 'name',
							type: 'string',
							description: 'name of the collection'},
						   {name: 'passwords',
							type: 'string',
							description: 'AES password list encryption'}]};
	$.ajax({
		type: 'PUT',
		url: url,
		contentType: "application/json",
		data: JSON.stringify(definition)})
		.fail(function() {
			// Error during the definition creation
			alert('Fail to create daybed definition for your account.');
		}).done(function() {
			// If we succeed, we have to post all collections to daybed
			data_url = url.replace('definition', 'data');
			remove_from_daybed(data_url);
			push_to_daybed(data_url);
		});
}

function compare_array(arr1, arr2) {
	return $(arr1).not(arr2).length == 0 && $(arr2).not(arr1).length == 0
}

// Password management
function reset_password() {
	__password = '';
}

function get_password() {
	if(__password == ''){
		close_collection();
	}
	return __password;
}

// Collection management
function close_collection() {
	__last_remove = '';
	__current_collection = '';
	__password = '';
	refresh_list();
}

function autoclose_collection() {
	current_timestamp = new Date().getTime();
	if(current_collection == __current_collection &&
	   (current_timestamp - last_event) >= FILE_AUTOCLOSE_TIMEOUT){
		close_collection();
	} else {
		(function (current_collection) { 
			setTimeout(autoclose_collection, 5000);
		})(get_collection());
	}
}

function get_current_collection() {
	if(__current_collection == ''){
		refresh_list();
	} else {
		return __current_collection;
	}
}

function create_collection() {
	name = $('#name').val();
	$('#name').val('');

	__password = $('#password').val();
	$('#password').val('');

	__current_collection = uuid4();
	c = {'uuid': __current_collection,
		 'name': name,
		 'passwords': sjcl.encrypt(__password, JSON.stringify([]))};
	set_collection(c);
	refresh_list();
}

function update_collection_list() {
	select = $('#select-collection');
	select.html('');  // Reinit
	collections = get_collections();
	for(var uuid in collections) {
		option = $('<option>');
		option.attr('value', uuid);
		option.html(collections[uuid]['name']);
		select.append(option);
	}
}

function select_collection() {
	__password = $('#select-password').val();
	$('#select-password').val('');

	(function (current_collection) { 
		setTimeout(autoclose_collection, 5000);
	})(get_collection());

	refresh_list();
}

function add_password(event) {
    data = {id: uuid4(),
			name: $('#service-name').val(),
			password: $('#service-password').val(),
			timestamp: event.timeStamp};
	add_to_list(data);
	$('#service-name').val('');
	$('#service-password').val('');
	refresh_list();
}

// LocalStorage management
function get_collections() {
	last_event = new Date().getTime();
	l = localStorage[STORAGE_INDEX];
    if(typeof(l) == 'undefined') {
		l = {};
	} else {
		l = JSON.parse(l);
	}
   return l;
}

function get_collection_list() {
	collections = get_collections();
	collection_list = [];
	for (var key in collections) {
		collection_list.push(collections[key]);
	}
	return collection_list;
}

function set_collections(c) {
	last_event = new Date().getTime();
	localStorage[STORAGE_INDEX] = JSON.stringify(c);
}

function remove_collection() {
	__password = $('#select-password').val();
	$('#select-password').val('');

	current_collection = get_current_collection();
	c = get_collections();
    try {
		sjcl.decrypt(__password, c[current_collection]['passwords']);
		delete c[current_collection];
	} catch (err) {
		alert('Wrong password');
	}
	set_collections(c);
	close_collection();
}

function get_collection() {
	current_collection = get_current_collection();
	c = get_collections();
	l = c[current_collection];
    if(typeof(l) == 'undefined') $('#keypass-link').click();
   return l;
}

function set_collection(l) {
	current_collection = get_current_collection();
	c = get_collections();
	c[current_collection] = l;
	set_collections(c);
}

function get_list() {
	password = get_password();
	c = get_collection();
	if(typeof(c) != 'undefined')
		try {
			return JSON.parse(sjcl.decrypt(password, c['passwords']));
		} catch (err) {
			alert('Wrong Password');
			close_collection();
		}
}

function set_list(l) {
	c = get_collection();
	password = get_password();
	c['passwords'] = sjcl.encrypt(password, JSON.stringify(l));
	set_collection(c);
}

function add_to_list(value) {
    var l = get_list();
    l.push(value);
    set_list(l);
    return l;
}

function del_from_list(value) {
    var l = get_list();
    var idx = jQuery.inArray(value, l);
    if (idx != -1) l.splice(idx, 1);
    set_list(l);
    return l;
}

function del_key_from_list(id) {
	l = get_list();
	for(var x in l) {
		if(l[x]['id'] == id) {
			__last_remove = l[x];
			l.splice(x, 1);
			set_list(l);
			refresh_list();
			break;
		}
	}
}

function undo_del_key_from_list() {
	if (__last_remove != '') {
		l = get_list();
		l.push(__last_remove);
		__last_remove = '';
		set_list(l);
		refresh_list();
	}
}

function refresh_list() {
	if(__current_collection == '') {
		$('#work').html(collection_template({collections: get_collection_list()}));
	} else {
		$('#work').html(service_template({passwords: get_list(), name: get_collection()['name'], undo: __last_remove != ''}));
	}
	$('#keypass-link').click();
	$(window).resize();
}

// Export / Import KeyPass
function download_keypass(){
	$(this).attr('href', 'data:,' + JSON.stringify(get_collection()));
	$(this).attr('download', 'keypass.json');
	return true;
}

// Event Setup
$(document).ready(function(){
	service_template = Handlebars.compile($('#service-template').html());
	collection_template = Handlebars.compile($('#collection-template').html());

	// Setup dialog modal
	$('#create-link').live('click', function() {
		$('#dialog-create-collection').dialog({
			width: 500,
			buttons: {
				Cancel: function() {
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				"Create a collection": function () {
					create_collection();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});
	$('#dialog-create-collection form').live('submit', function(){
		create_collection();
		$('#dialog-create-collection').dialog("close");
		return false;
	});

	$('#daybed-sync-from').live('click', function() {
		__sync_callback = sync_from_daybed;
		$('#dialog-daybed-sync').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				Ok: function () {
					__sync_callback();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});
	$('#daybed-sync-to').live('click', function() {
		__sync_callback = sync_to_daybed;
		$('#dialog-daybed-sync').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				Ok: function () {
					__sync_callback();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});
	$('#dialog-daybed-sync form').live('submit', function(){
		__sync_callback();
		$('#dialog-daybed-sync').dialog("close");
		return false;
	});

	$('#collection-close').live('click', function() {
		close_collection();
	});

	$('#collection-open').live('click', function() {
		__current_collection = $(this).attr('data-id');
		__enter_password_callback = select_collection;
		$('#dialog-enter-password').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					__current_collection = '';
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				Ok: function () {
					select_collection();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});

	$('#collection-delete').live('click', function() {
		__current_collection = $(this).attr('data-id');
		__enter_password_callback = remove_collection;
		$('#dialog-enter-password').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					__current_collection = '';
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				Ok: function () {
					remove_collection();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});

	$('#dialog-enter-password form').live('submit', function(){
		__enter_password_callback();
		$('#dialog-enter-password').dialog("close");
		return false;
	});

	$('#add-password-link').live('click', function(event) {
		last_event = new Date().getTime();
		$('#dialog-add-password').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					$(this).find('form input').each(function(){$(this).val('');});
					$(this).find('form textarea').each(function(){$(this).val('');});
					$(this).dialog("close");
				},
				"Add password": function () {
					add_password(event);
					refresh_list();
					$(this).dialog("close");
				}
			}
		});
		return false;
	});
	$('#dialog-add-password form').live('submit', function(event){
		add_password(event);
		$('#dialog-add-password').dialog("close");
		return false;
	});
	

	$('button.reveal').live('click', function(){
		$('#show-password').val($(this).attr('data-encoded'));
		last_event = new Date().getTime();
		$('#dialog-show-password').dialog({
			width: 600,
			buttons: {
				Ok: function() {
					$(this).find('textarea').each(function(){ $(this).val(''); });
					$(this).dialog("close");
				}
			}
		});
	});
	$('button.remove').live('click', function(){
		del_key_from_list($(this).attr('data-id'));
	});
	$('#download').live('click', download_keypass);
	$('#undo').live('click', undo_del_key_from_list);
	refresh_list();
});

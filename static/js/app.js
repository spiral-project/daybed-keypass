var STORAGE_INDEX = "keypass";
var FILE_AUTOCLOSE_TIMEOUT = 30000;  // 30 seconds

var last_event = new Date().getTime();

var __password = '';
var __current_collection = '';

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


// Password management
function reset_password() {
	__password = '';
}

function get_password() {
	if(__password == ''){
		reset_list();
	}
	return __password;
}

// Collection management
function close_collection() {
	__current_collection = '';
	__password = '';
	reset_list();
}

function autoclose_collection() {
	current_timestamp = new Date().getTime();
	if(current_collection == __current_collection &&
	   (current_timestamp - last_event) >= FILE_AUTOCLOSE_TIMEOUT){
		close_collection();
	} else {
		(function (current_collection) { 
			setTimeout(autoclose_collection, FILE_AUTOCLOSE_TIMEOUT);
		})(get_collection());
	}
}

function get_current_collection() {
	if(__current_collection == ''){
		reset_list();
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
	__current_collection = $('#select-collection').val();
	$('#select-collection').val('');

	__password = $('#select-password').val();
	$('#select-password').val('');

	(function (current_collection) { 
		setTimeout(autoclose_collection, FILE_AUTOCLOSE_TIMEOUT);
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

function set_collections(c) {
	last_event = new Date().getTime();
	localStorage[STORAGE_INDEX] = JSON.stringify(c);
}

function remove_collection() {
	current_collection = get_current_collection();
	c = get_collections();
	delete c[current_collection];
	set_collections(c);
	close_collection();
}

function get_collection() {
	current_collection = get_current_collection();
	c = get_collections();
	l = c[current_collection]
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
			l.splice(x, 1);
			set_list(l);
			refresh_list();
			break;
		}
	}
}

function refresh_list() {
	$('#password-list').html(service_template({keypass: get_list(), name: get_collection()['name']}));
	$('#keypass-link').click();
	$(window).resize();
}

function reset_list() {
	$('#password-list').html('');
	$('#keypass-link').click();
	$(window).resize();
}

// Export / Import KeyPass
function download_keypass(){
	$(this).attr('href', 'data:,' + JSON.stringify(get_collections()));
	$(this).attr('download', 'keypass.json');
	return true;
}

// Event Setup
$(document).ready(function(){
	service_template = Handlebars.compile($('#service-template').html());

	// Setup dialog modal
	$('#create-link').click(function() {
		$('#dialog-create-collection').dialog({
			width: 500,
			buttons: {
				Cancel: function() {
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
	$('#dialog-create-collection form').submit(function(){
		create_collection();
		$('#dialog-create-collection').dialog("close");
		return false;
	});

	$('#select-link').click(function() {
		update_collection_list();
		$('#dialog-select-collection').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
					$(this).dialog("close");
				},
				"Select collection": function () {
					select_collection();
					$(this).dialog("close");
				},
				"Create one": function () {
					$(this).dialog("close");
					$('#create-link').click();
				}
			}
		});
		return false;
	});
	$('#dialog-select-collection form').submit(function(){
		select_collection();
		$('#dialog-select-collection').dialog("close");
		return false;
	});

	$('#add-password-link').live('click', function(event) {
		last_event = new Date().getTime();
		$('#dialog-add-password').dialog({
			width: 600,
			buttons: {
				Cancel: function() {
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
	$('#dialog-add-password form').submit(function(){
		select_collection();
		$('#dialog-select-collection').dialog("close");
		return false;
	});
	

	$('button.reveal').live('click', function(){
		$('#show-password').val($(this).attr('data-encoded'));
		last_event = new Date().getTime();
		$('#dialog-show-password').dialog({
			width: 600,
			buttons: {
				Ok: function() {
					$(this).dialog("close");
				}
			}
		});
	});
	$('button.remove').live('click', function(){
		del_key_from_list($(this).attr('data-id'));
	});
	$('#download').live('click', download_keypass);
	$('#delete').live('click', remove_collection);
	
});

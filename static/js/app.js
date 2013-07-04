var STORAGE_INDEX = "keypass";
var PASSWORD_TIMEOUT = 3000;

var __password = '';
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
		__password = prompt('Enter your password');
		setTimeout(reset_password, PASSWORD_TIMEOUT);
	}
	return __password;
}

// LocalStorage management
function get_list() {
	l = localStorage[STORAGE_INDEX];
    if(typeof(l) == 'undefined') l = [];
	else l = JSON.parse(l);
   return l;
}

function set_list(l) {
    localStorage[STORAGE_INDEX] = JSON.stringify(l);
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

function reset_list() {
    set_list([]);
	refresh_list();
}

function refresh_list() {
	$('#password-list').html(service_template({keypass: get_list()}));
	$('#keypass-link').click();
}

// Export / Import KeyPass
function download_keypass(){
	$(this).attr('href', 'data:,' + JSON.stringify(get_list()));
	$(this).attr('download', 'keypass.json');
	return true;
}

// Event Setup
$(document).ready(function(){
	service_template = Handlebars.compile($('#service-template').html());

    $('#keypass-form').submit(function(event){
		password = get_password();
        data = {id: uuid4(),
				name: $('#service-name').val(),
				password: sjcl.encrypt(password, $('#service-password').val()),
				timestamp: event.timeStamp};
		add_to_list(data);
		refresh_list();
		return false;
	});
	$('button.reveal').live('click', function(){
		while(1) {
    		password = get_password();
    		try {
    			alert(sjcl.decrypt(password, $(this).attr('data-encoded')));
				break;
            } catch (err) {
    			alert('Wrong Password');
    			reset_password();
            }
		}

	});
	$('button.remove').live('click', function(){
		del_key_from_list($(this).attr('data-id'));
	});
	$('#reset_list').click(reset_list);
	$('#reset_password').click(reset_password);
	$('#download').click(download_keypass);
	refresh_list();
});

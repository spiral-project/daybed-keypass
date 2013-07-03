var STORAGE_INDEX = "keypass";
var PASSWORD_TIMEOUT = 3000;

var __password = '';
var service_template = '';

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

function del_key_from_list(name) {
	l = get_list();
	for(var x in l) {
		if(l[x]['name'] == name) {
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
}


$(document).ready(function(){
	service_template = Handlebars.compile($('#service-template').html());

    $('#keypass-form').submit(function(event){
		password = get_password();
        data = {name: $('#service-name').val(), password: sjcl.encrypt(password, $('#service-password').val()), timestamp: event.timeStamp};
		add_to_list(data);
		refresh_list();
		return false;
	});
	$('button.reveal').live('click', function(){
		password = get_password();
		alert(sjcl.decrypt(password, $(this).attr('data-encoded')));
	});
	$('button.remove').live('click', function(){
		del_key_from_list($(this).attr('data-name'));
	});
	$('#reset_list').click(reset_list);
	$('#reset_password').click(reset_password);
	refresh_list();
});
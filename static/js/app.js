var storage_index = "keypass";
var __password = '';
var service_template = '';

function reset_password() {
	__password = '';
}

function get_password() {
	if(__password == ''){
		__password = prompt('Enter your password');
		setTimeout(reset_password, 3000);
	}
	return __password;
}

function get_list() {
	l = localStorage[storage_index];
    if(typeof(l) == 'undefined') l = [];
	else l = JSON.parse(l);
   return l;
}

function set_list(l) {
    localStorage[storage_index] = JSON.stringify(l);
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
	$('#reset').live('click', reset_list);
	refresh_list();
});
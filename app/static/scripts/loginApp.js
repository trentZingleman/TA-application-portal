
var loginAppr = (function () {

    //PRIVATE VARIABLES

    var apiUrl = 'http://127.0.0.1:5000';   //the url that the api/database is located
    var appSpace = 'initialSpace';                  //the space where we are going to store our data





    //PRIVATE METHODS

    /**
   * HTTP GET request 
   * @param  {string}   url       URL path, e.g. "/api/smiles"
   * @param  {function} onSuccess   callback method to execute upon request success (200 status)
   * @param  {function} onFailure   callback method to execute upon request failure (non-200 status)
   * @return {None}
   */
    var makeGetRequest = function (url, onSuccess, onFailure) {
        $.ajax({
            type: 'GET',
            url: apiUrl + url,
            dataType: "json",
            success: onSuccess,
            error: onFailure
        });
    };


    /**
    * HTTP POST request
    * @param  {string}   url       URL path, e.g. "/api/smiles"
    * @param  {Object}   data      JSON data to send in request body
    * @param  {function} onSuccess   callback method to execute upon request success (200 status)
    * @param  {function} onFailure   callback method to execute upon request failure (non-200 status)
    * @return {None}
    */
    var makePostRequest = function(url, data, onSuccess, onFailure) {
        $.ajax({
            type: 'POST',
            url: apiUrl + url,
            data: JSON.stringify(data),
            contentType: "application/json",
            dataType: "json",
            success: onSuccess,
            error: onFailure
        });
    };


    var clickHandlers = function (e) {

        $('.login-button').on('click', function (e) {
            e.preventDefault();

            //first make sure fields are inputted correctly
            var errorString = "";

            if ($('.sign-in-htm').find('.user-email').val().length == 0) { errorString = errorString + "Please input email\n"; }
            if ($('.sign-in-htm').find('.user-email').val().length > 128) { errorString = errorString + "Email cannot be longer than 128 characters\n"; }
            if ($('.sign-in-htm').find('.user-password').val().length == 0) { errorString = errorString + "Please input password\n"; }
            if ($('.sign-in-htm').find('.user-password').val().length > 64) { errorString = errorString + "Password cannot be longer than 64 characters\n"; }

            if (errorString != "") { alert(errorString); return; }

            var loginUser = {};   //prepare user object to send to server and attempt to log in
            loginUser.email = $('.sign-in-htm').find('.user-email').val();
            loginUser.password = $('.sign-in-htm').find('.user-password').val();
            //loginUser.name = "temp";
            //loginUser.isTeacher = "temp"

            //read if they want to be remembered or not
            if ($('.remember-user').is(':checked')) { loginUser.rememberMe = "true"; }
            else { loginUser.rememberMe = "false"; }

            var onSuccess = function (data) {
                window.location = apiUrl + data.redirect;   //update clients browser to new webpage
                //console.error(data.redirect);
            };
            var onFailure = function () {
                console.error('login failed');
            };

            makePostRequest('/login', loginUser, onSuccess, onFailure);
        });

        $('.create-button').on('click', function (e) {
            e.preventDefault();
            var errorString = "";

            if ($('.sign-up-htm').find('.new-email').val().length == 0) { errorString = errorString + "Please input email\n"; }
            if ($('.sign-up-htm').find('.new-email').val().length > 128) { errorString = errorString + "Email cannot be longer than 128 characters\n"; }
            if ($('.sign-up-htm').find('.new-pawword-1').val().length == 0) { errorString = errorString + "Please input password\n"; }
            if ($('.sign-up-htm').find('.new-pawword-1').val().length > 64) { errorString = errorString + "Password cannot be longer than 64 characters\n"; }
            if ($('.sign-up-htm').find('.new-pawword-1').val() != $('.sign-up-htm').find('.new-pawword-2').val()) { errorString = errorString + "Passwords do not match\n"; }
            if ($('.sign-up-htm').find('.new-first-name').val().length + $('.sign-up-htm').find('.new-last-name').val().length > 64) { errorString = errorString + "Combination of your first and last name cannot be longer than 64 characters\n"; }
            if (($('.sign-up-htm').find('.new-first-name').val().length && $('.sign-up-htm').find('.new-last-name').val().length) == 0) { errorString = errorString + "Please input your name\n"; }

            if (errorString != "") { alert(errorString); return; }

            var newName = "";
            if ($('.sign-up-htm').find('.new-first-name').val().length == 0) { newName = $('.sign-up-htm').find('.new-last-name').val(); }
            else if ($('.sign-up-htm').find('.new-last-name').val().length == 0) { newName = $('.sign-up-htm').find('.new-first-name').val(); }
            else { newName = $('.sign-up-htm').find('.new-first-name').val() + " " + $('.sign-up-htm').find('.new-last-name').val(); }

            var createUser = {};
            createUser.email = $('.sign-up-htm').find('.new-email').val();
            createUser.password = $('.sign-up-htm').find('.new-pawword-1').val();
            createUser.name = newName;
            var ischecked = "";
            if ($('.am-student').is(':checked')) { createUser.isStudent = "true"; }
            else { createUser.isStudent = "false"; }

            var onSuccess = function (data) {
                //window.location = apiUrl + data.redirect;   //update clients browser to new webpage
                alert("Account created, please log in\n");
                //console.error(data.redirect);
            };
            var onFailure = function () {
                console.error('create account failed');
            };

            makePostRequest('/createAcct', createUser, onSuccess, onFailure);

        });
    }


    var start = function () {

        clickHandlers();

    };
    


    return {
        start: start
    };
    
})();

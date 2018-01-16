
var portalAppr = (function () {

    //PRIVATE VARIABLES

    var apiUrl = 'http://127.0.0.1:5000';   //the url that the api/database is located
    var appSpace = 'initialSpace';                  //the space where we are going to store our data
    var me;                                //the the current user

    /** the idea behind having a local list of the applications (of the student, (users not implemented yet, all applications are being displayed))
    * is that we can sort from our own list (when pressing the header in the table) instead of calling the server
    * this reduces load times significantly which is one of our primary objectives
    */
    var appliedApplications = [];        //an array of applied applications. (we are doing this to reduce communications with the server thus increasing performance)
    var acceptedApplications = [];       //an array of accepted applications. (we are doing this to reduce communications with the server thus increasing performance)
    var myLectures = [];                //array of the current teachers lectures
    //var allApplications;            //a entry container for all applications (used for client side sorting and things, reduces load times)

    var acceptedApplicationsTemplate;      //a template for creating accepted applications
    var appliedApplicationsTemplate;       //a template for creating applied applications
    var myLecturesTemplate;                //a template for creating the teachers lectures

    //applied application values (for sorting the list depending on what button is clicked)
    var appliedUserNameOrder = 1;
    var appliedClassNameOrder = 1;
    var appliedClassTimeOrder = 1;
    var appliedClassDaysOrder = 1;
    var appliedAppTimeOrder = 1;
    var appliedIsClosedOrder = 1;

    //accepted application values (for sorting the list depending on what button is clicked)
    var acceptedUserNameOrder = 1;
    var acceptedClassNameOrder = 1;
    var acceptedClassTimeOrder = 1;
    var acceptedClassDaysOrder = 1;

    //my lecture values (for sorting the list depending on what button is clicked)
    var myLecturesUserNameOrder = 1;
    var myLecturesClassNameOrder = 1;
    var myLecturesClassTimeOrder = 1;
    var myLecturesClassDaysOrder = 1;

    var takenClassesTemplate;       //a template for showing each individual class the student has taken
    var watchingClassesTemplate;    //a template for showing each individual class the srudent is watching

    var savedTakenClassesTemplate;
    var savedWatchingClassesTemplate;

    var watchedClassesToDelete = [];
    var takenClassesToDelete = [];
    var watchedClassesToAdd = [];
    var takenClassesToAdd = [];

    var profileToggler = 0;

    var popupProfileButtonTemplate;

    var popupProfileTakenClassTemplate;
    var popupProfileTakenClassContainer;
    var popupProfileClassInfoContainer;
    var popupProfileBioContainer;

    /**
   * Sort by function that sorts a list of applications by an inputted property (eg, 'className') and will order it based on the order value
   * @param  {Object}   property       the property which you want to sort the applications by (eg, "className")
   * @param  {Integer} order   the order of the list. 1 will order the list ascending, -1 will order the list descending
   * @return {Object}
   */
    function sortBy(property, order) {
        return function (a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * order;
        }
    }



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

    /**
   * HTTP DELETE request 
   * @param  {string}   url       URL path, e.g. "/api/smiles"
   * @param  {function} onSuccess   callback method to execute upon request success (200 status)
   * @param  {function} onFailure   callback method to execute upon request failure (non-200 status)
   * @return {None}
   */
    var makeDeleteRequest = function (url, onSuccess, onFailure) {
        $.ajax({
            type: 'DELETE',
            url: apiUrl + url,
            dataType: "json",
            success: onSuccess,
            error: onFailure
        });
    };





    var getSignedRequest = function (file) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl + "/api/sign-file");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    uploadFile(file, response.data, response.url);
                }
                else {
                    alert("Could not get signed URL.");
                }
            }
        };
        xhr.send(JSON.stringify({ file_type: file.type }));
    };


    var uploadFile = function (file, s3Data, url) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", s3Data.url);

        var postData = new FormData();
        for (key in s3Data.fields) {
            postData.append(key, s3Data.fields[key]);
        }
        postData.append('file', file);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 204) {
                    //it did it so tell server it was updated

                    var newProfilePictureURL = {};
                    newProfilePictureURL.url = url;

                    var onSuccess = function (data) {
                        var pictureURL = 'url(' + data.profile.pictureURL + ')';
                        $('.profile-picture-section').css('background-image', pictureURL);
                    };
                    var onFailure = function () {
                        console.error('Could not update user profile picture URL');
                    };
                    makePostRequest('/api/profile/picture/update', newProfilePictureURL, onSuccess, onFailure);
                }
                else {
                    alert("Could not upload file.");
                }
            }
        };
        xhr.send(postData);
    };

    var insertTakenClasses = function (takenClasses) {
        var i = 0;
        while (takenClasses[i]) {
            newElm = savedTakenClassesTemplate.clone(true);
            newElm.find('.class-name').text(takenClasses[i].className);
            newElm.find('.class-grade').text(takenClasses[i].grade);
            newElm.appendTo(".edit-courses-taken-section");
            i++;
        }
    };

    var insertWatchedClasses = function (watchedClasses) {
        var i = 0;
        while (watchedClasses[i]) {
            newElm = savedWatchingClassesTemplate.clone(true);
            newElm.find('.class-name').text(watchedClasses[i].className);
            newElm.appendTo(".edit-watch-for-courses-section");
            i++;
        }
    };


    var loadMyInfo = function () {
        var onSuccess = function (data) {
            var pictureURL = 'url(' + data.profile.pictureURL + ')';
            $('.profile-picture-section').css('background-image', pictureURL);  //get profile picture
            if (data.profile.bio != null) { $('.edit-bio-textbox').text(data.profile.bio); }  //get bio
            if (me.type == 'student') {
                insertTakenClasses(data.profile.taken);     //get taken classes (student)
                insertWatchedClasses(data.profile.watching);    //get watching classes (student)
            }

            //get notifications:
            if (data.profile.receiveNotifications == "True") { $(".notification-checkbox").attr('checked', true); }
            else { $(".notification-checkbox").attr('checked', false); }

        };
        var onFailure = function () {
            console.error('Could not retreive user data');
        };
        makeGetRequest('/api/profile/' + me.id, onSuccess, onFailure);
    };




    var insertTakenClassesToMiniPopupProfile = function (takenClasses) {
        takenClasses.reverse();   //reverse array (dont kow if this is what we want yet)

        var i = 0;
        while (takenClasses[i]) {
            newElm = popupProfileTakenClassTemplate.clone(true);
            newElm.find('.mini-profile-class-name').text(takenClasses[i].className);
            newElm.find('.mini-profile-class-grade').text(takenClasses[i].grade);
            $(".mini-profile-class-info-list").after(newElm);
            i++;
        }
    };


    var detatchMiniPopupProfileStuff = function () {
        if (me.type == 'teacher') {
            $(".mini-profile-classes-taken-container").detach();
            $(".mini-profile-class-info-container").detach();
        }
        $(".mini-profile-container").find(".mini-profile-button").detach();
        $(".mini-profile-bio-container").detach();
    };


    //generalInfo contains the following:
        //isFromAccepted
        //application_id
        //lecture_id
        //profile_id
        //className
        //classDays
        //classTime
        //wantedTAs
        //currentTAs
    var showMiniPopupProfile = function (generalInfo) {
        var onSuccess = function (data) {
            detatchMiniPopupProfileStuff();

            if (me.type == 'student') {
                //make sure it shows the correct button:
                if (generalInfo.application_id == null) {
                    $(".mini-profile-container").removeClass("show-mini-profile");   //hide the previous mini profile (if there was one)

                    applyButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Apply");
                    backButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Back");

                    backButton.on('click', function (e) {
                        //hides the mini profile window
                        $(".mini-profile-container").removeClass("show-mini-profile");
                        $(".highlighted").removeClass("highlighted");
                    });

                    applyButton.on('click', function (e) {
                        //when the user clicks the apply button
                        var onApplySuccess = function (appliedData) {
                            alert("You have successfully applied to this position");

                            appliedApplications.unshift(appliedData.applications);     //add this newly applied application to the beginning of the array of applied applications
                            $(".applied-applications-data").detach();
                            insertAppliedApplications();

                            $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                        };
                        var onApplyFailure = function () {
                            console.error('Could not apply to position');
                        };
                        makePostRequest('/api/lectures/' + generalInfo.lecture_id + '/apply', {}, onApplySuccess, onApplyFailure);
                    });

                    $(".button-break").after(backButton);
                    $(".button-break").after(applyButton);
                    $(".mini-profile-container").addClass("show-mini-profile");     //show the mini popup profile window of user
                }
                else {
                    $(".mini-profile-container").removeClass("show-mini-profile");   //hide the previous mini profile (if there was one)

                    deleteButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Delete");
                    backButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Back");

                    backButton.on('click', function (e) {
                        //hides the mini profile window
                        $(".mini-profile-container").removeClass("show-mini-profile");
                        $(".highlighted").removeClass("highlighted");
                    });

                    deleteButton.on('click', function (e) {
                        //when the user clicks the delete button
                        var onDeleteSuccess = function (deleteData) {
                            alert("You have successfully removed your application to this position");
                            
                            var i = 0;
                            if (generalInfo.isFromAccepted) {
                                while (acceptedApplications[i]) {
                                    if (acceptedApplications[i].id == generalInfo.application_id) {
                                        //found the deleting application in the acceptedApplications array

                                        acceptedApplications.splice(i, 1);   //delete it from the array
                                        $(".accepted-applications-data[application_id='" + generalInfo.application_id + "']").detach();

                                        $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                                        return;
                                    }
                                    i++;
                                }
                            }
                            else {
                                while (appliedApplications[i]) {
                                    if (appliedApplications[i].id == generalInfo.application_id) {
                                        //found the deleting application in the appliedApplications array

                                        appliedApplications.splice(i, 1);   //delete it from the array
                                        $(".applied-applications-data[application_id='" + generalInfo.application_id + "']").detach();

                                        $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                                        return;
                                    }
                                    i++;
                                }
                            }
                            alert("Could not find application to delete in memory, please refresh page");
                        };
                        var onDeleteFailure = function () {
                            console.error('Could not remove application to position');
                        };
                        makeDeleteRequest('/api/applications/' + generalInfo.application_id, onDeleteSuccess, onDeleteFailure);
                    });

                    $(".button-break").after(backButton);
                    $(".button-break").after(deleteButton);
                    $(".mini-profile-container").addClass("show-mini-profile");     //show the mini popup profile window of user
                }

                $(".mini-profile-class-name").text(generalInfo.className);    //write the class name
                $(".mini-profile-class-days").text(generalInfo.classDays);    //write the class days
                $(".mini-profile-class-time").text(generalInfo.classTime);    //write the class time
            }
            else {
                //make sure it shows the correct button:
                if (generalInfo.application_id == null) {
                    //its from a lecture
                    $(".mini-profile-container").removeClass("show-mini-profile");   //hide the previous mini profile (if there was one)

                    $(".mini-profile-horizontal-line").after(popupProfileClassInfoContainer.clone(true));

                    $(".mini-profile-class-name").text(generalInfo.className);    //write the class name
                    $(".mini-profile-class-days").text(generalInfo.classDays);    //write the class days
                    $(".mini-profile-class-time").text(generalInfo.classTime);    //write the class time
                    $(".mini-profile-tas-wanted").text(generalInfo.wantedTAs);    //write the wanted TAs
                    $(".mini-profile-tas-accepted").text(generalInfo.currentTAs);    //write the current TAs

                    deleteButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Delete");
                    editButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Edit");

                    deleteButton.on('click', function (e) {
                        //when the delete button is clicked, it deletes lecture
                        var onDeleteSuccess = function (deleteData) {
                            alert("You have successfully removed this lecture");

                            //refresh tables:
                            $(".my-lectures-data[lecture_id='" + generalInfo.lecture_id + "']").detach();
                            $(".accepted-applications-data[lecture_id='" + generalInfo.lecture_id + "']").detach();
                            $(".applied-applications-data[lecture_id='" + generalInfo.lecture_id + "']").detach();

                            $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                            
                            for (var i = 0; i < myLectures[i].length; i++) {
                                if (myLectures[i].id == generalInfo.lecture_id) {
                                    //remove the lecture from the lectures array
                                    myLectures.splice(i, 1);
                                    break;
                                }
                            }
                            
                            for (var i = 0; i < acceptedApplications[i].length; i++) {
                                if (acceptedApplications[i].lecture_id == generalInfo.lecture_id) {
                                    //remove the application from the applied accepted array
                                    acceptedApplications.splice(i, 1);
                                }
                            }
                            
                            for (var i = 0; i < appliedApplications[i].length; i++) {
                                if (appliedApplications[i].lecture_id == generalInfo.lecture_id) {
                                    //remove the application from the applied accepted array
                                    appliedApplications.splice(i, 1);
                                }
                            }
                            
                        };
                        var onDeleteFailure = function () {
                            console.error('Could not remove this lecture');
                        };
                        makeDeleteRequest('/api/lectures/' + generalInfo.lecture_id, onDeleteSuccess, onDeleteFailure);
                    });

                    editButton.on('click', function (e) {
                        //when the edit button is clicked, it brings up a window to edit a lecture
                        $(".mini-profile-container").removeClass("show-mini-profile");
                        $(".highlighted").removeClass("highlighted");
                    });

                    $(".button-break").after(editButton);
                    $(".button-break").after(deleteButton);
                    $(".mini-profile-container").addClass("show-mini-profile");     //show the mini popup profile window of user
                }
                else if (generalInfo.isFromAccepted) {
                    //the one application clicked on is from the list of accepted applications
                    $(".mini-profile-container").removeClass("show-mini-profile");   //hide the previous mini profile (if there was one)
                    
                    $(".mini-profile-horizontal-line").after(popupProfileTakenClassContainer.clone(true));

                    deleteButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Delete");
                    closeButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Close");

                    //write the classes taken of the student to the mini profile view:
                    insertTakenClassesToMiniPopupProfile(data.profile.taken);

                    deleteButton.on('click', function (e) {
                        //when the user clicks the delete button
                        var onDeleteSuccess = function (deleteData) {
                            alert("You have successfully removed this TA from your lecture");

                            var i = 0;
                            while (acceptedApplications[i]) {
                                if (acceptedApplications[i].id == generalInfo.application_id) {
                                    //remove the application from the applied accepted array
                                    acceptedApplications.splice(i, 1);

                                    //refresh tables:
                                    $(".accepted-applications-data[application_id='" + generalInfo.application_id + "']").detach();

                                    $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                                    return;
                                }
                                i++;
                            }
                            alert("Could not find TA to delete in memory, please refresh page");
                        };
                        var onDeleteFailure = function () {
                            console.error('Could not remove this TA from your lecture');
                        };
                        makeDeleteRequest('/api/applications/' + generalInfo.application_id, onDeleteSuccess, onDeleteFailure);
                    });

                    closeButton.on('click', function (e) {
                        //hides the mini profile window
                        $(".mini-profile-container").removeClass("show-mini-profile");
                        $(".highlighted").removeClass("highlighted");
                    });

                    $(".button-break").after(closeButton);
                    $(".button-break").after(deleteButton);
                    $(".mini-profile-container").addClass("show-mini-profile");     //show the mini popup profile window of user
                }
                else {
                    //the one application clicked on is from the list of applied applications
                    $(".mini-profile-container").removeClass("show-mini-profile");   //hide the previous mini profile (if there was one)
                    
                    $(".mini-profile-horizontal-line").after(popupProfileTakenClassContainer.clone(true));

                    insertTakenClassesToMiniPopupProfile(data.profile.taken);   //write the classes taken of the student to the mini profile view

                    acceptButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Accept");
                    ignoreButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Ignore");

                    ignoreButton.on('click', function (e) {
                        //when the user clicks the ignore button
                        var onDeleteSuccess = function (deleteData) {
                            var i = 0;
                            while (appliedApplications[i]) {
                                if (appliedApplications[i].id == generalInfo.application_id) {
                                    //remove the application from the applied accepted array
                                    appliedApplications.splice(i, 1);

                                    //refresh tables:
                                    $(".applied-applications-data[application_id='" + generalInfo.application_id + "']").detach();

                                    $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                                    return;
                                }
                                i++;
                            }
                            alert("Could not find TA to ignore in memory, please refresh page");
                        };
                        var onDeleteFailure = function () {
                            console.error('Could not ignore this TAs application');
                        };
                        makeDeleteRequest('/api/applications/' + generalInfo.application_id, onDeleteSuccess, onDeleteFailure);
                    });

                    acceptButton.on('click', function (e) {
                        //when the user clicks the accept button
                        var onAcceptSuccess = function (acceptedData) {
                            alert("You have successfully accepted this application");

                            var i = 0;
                            while (appliedApplications[i]) {
                                if (appliedApplications[i].id == generalInfo.application_id) {
                                    //remove the application from the applied application array to the accepted application array
                                    acceptedApplications.unshift(appliedApplications[i]);
                                    appliedApplications.splice(i, 1);

                                    //refresh tables:
                                    $(".applied-applications-data[application_id='" + generalInfo.application_id + "']").detach();
                                    $(".accepted-applications-data").detach();
                                    insertAcceptedApplications();

                                    $(".mini-profile-container").removeClass("show-mini-profile");  //hides the mini profile window
                                    return;
                                }
                                i++;
                            }
                            alert("Could not find application to accept in memory, please refresh page");
                        };
                        var onAcceptFailure = function () {
                            console.error('Could not accept this application');
                        };
                        makePostRequest('/api/applications/' + generalInfo.application_id + '/accept', {}, onAcceptSuccess, onAcceptFailure);
                    });

                    $(".button-break").after(ignoreButton);
                    $(".button-break").after(acceptButton);
                    $(".mini-profile-container").addClass("show-mini-profile");     //show the mini popup profile window of user
                }
            }
            
            $(".mini-profile-persons-name").text(data.profile.name);    //write the name of the person
            $(".mini-profile-persons-occupation").text(data.profile.type.charAt(0).toUpperCase() + data.profile.type.slice(1));    //write the type of user
            $(".mini-profile-picture").attr("src", data.profile.pictureURL);    //load the users profile picture

            if (data.profile.bio != null) {
                $(".mini-profile-horizontal-line").before(popupProfileBioContainer.clone(true));
                $(".mini-profile-bio").text(data.profile.bio);      //write bio of user
            }
            
        };
        var onFailure = function () {
            console.error('Could not retreive user data');
        };
        makeGetRequest('/api/profile/' + generalInfo.profile_id, onSuccess, onFailure);
    };




    var groupProfileInfo = function (curElem, isFromLecture, isFromAccepted) {
        groupedInfo = {};

        if (isFromLecture) {
            groupedInfo.application_id = null;
            if (me.type == 'teacher') {
                groupedInfo.wantedTAs = curElem.attr('wantedTAs');
                groupedInfo.currentTAs = curElem.attr('currentTAs');
            }
        }
        else {
            groupedInfo.application_id = curElem.attr('application_id');
        }
        
        groupedInfo.isFromAccepted = isFromAccepted;
        groupedInfo.profile_id = curElem.attr('profile_id');
        groupedInfo.lecture_id = curElem.attr('lecture_id');
        groupedInfo.className = curElem.attr('className');
        groupedInfo.classDays = curElem.attr('classDays');
        groupedInfo.classTime = curElem.attr('classTime');
        
        return groupedInfo;
    };



    /**
     * Insert the accepted applications into the accepted applications table
     * @return {None}
     */
    var insertAcceptedApplications = function () {
        var i = 0;
        while (acceptedApplications[i]) {
            
            var newElem = acceptedApplicationsTemplate.clone(true);
            newElem.attr('application_id', acceptedApplications[i].id);
            newElem.attr('lecture_id', acceptedApplications[i].lecture_id);
            newElem.attr('className', acceptedApplications[i].className);
            newElem.attr('classTime', acceptedApplications[i].classTime);
            newElem.attr('classDays', acceptedApplications[i].classDays);
            
            newElem.find('.accApp-className').text(acceptedApplications[i].className);
            newElem.find('.accApp-classTime').text(acceptedApplications[i].classTime);
            newElem.find('.accApp-classDays').text(acceptedApplications[i].classDays);

            if (me.type == 'student') {
                newElem.find('.accApp-userName').text(acceptedApplications[i].lecture_teacherName);
                newElem.attr('profile_id', acceptedApplications[i].teacher_id);
            }
            else {
                newElem.find('.accApp-userName').text(acceptedApplications[i].studentName);
                newElem.attr('profile_id', acceptedApplications[i].student_id);
            }

            newElem.on('click', function (e) {
                showMiniPopupProfile(groupProfileInfo($(this), false, true));
                $(".highlighted").removeClass("highlighted");
                $(this).addClass("highlighted");
            });

            $(".accepted-applications-hdr").after(newElem);

            i++;
        }
    };

    /**
     * Insert the applied applications into the applied applications table
     * @return {None}
     */
    var insertAppliedApplications = function () {
        var i = 0;
        while (appliedApplications[i]) {

            var newElem = appliedApplicationsTemplate.clone(true);
            newElem.attr('application_id', appliedApplications[i].id);
            newElem.attr('lecture_id', appliedApplications[i].lecture_id);
            newElem.attr('className', appliedApplications[i].className);
            newElem.attr('classTime', appliedApplications[i].classTime);
            newElem.attr('classDays', appliedApplications[i].classDays);
            
            newElem.find('.curApp-className').text(appliedApplications[i].className);
            newElem.find('.curApp-classTime').text(appliedApplications[i].classTime);
            newElem.find('.curApp-classDays').text(appliedApplications[i].classDays);
            
            if (me.type == 'student') {
                newElem.find('.curApp-userName').text(appliedApplications[i].lecture_teacherName);
                newElem.find('.curApp-isClosed').text(appliedApplications[i].lecture_isClosed);
                newElem.attr('profile_id', appliedApplications[i].teacher_id);
            }
            else {
                newElem.find('.curApp-userName').text(appliedApplications[i].studentName);
                newElem.find('.curApp-appTime').text(appliedApplications[i].created_at);
                newElem.attr('profile_id', appliedApplications[i].student_id);
            }

            newElem.on('click', function (e) {
                showMiniPopupProfile(groupProfileInfo($(this), false, false));
                $(".highlighted").removeClass("highlighted");
                $(this).addClass("highlighted");
            });

            $(".applied-applications-hdr").after(newElem);

            i++;
        }
    };

    /**
     * Insert the lecture into the lectures table
     * @return {None}
     */
    var insertLectures = function () {
        var i = 0;
        while (myLectures[i]) {
            
            var newElem = myLecturesTemplate.clone(true);
            newElem.attr('lecture_id', myLectures[i].id);
            newElem.attr('profile_id', myLectures[i].teacher_id);
            newElem.attr('wantedTAs', myLectures[i].wantedTAs);
            newElem.attr('currentTAs', myLectures[i].currentTAs);
            newElem.attr('className', myLectures[i].className);
            newElem.attr('classTime', myLectures[i].classTime);
            newElem.attr('classDays', myLectures[i].classDays);

            newElem.find('.opnApp-className').text(myLectures[i].className);
            newElem.find('.opnApp-classTime').text(myLectures[i].classTime);
            newElem.find('.opnApp-classDays').text(myLectures[i].classDays);

            if (me.type == 'student') { newElem.find('.opnApp-userName').text(myLectures[i].teacherName); }

            newElem.on('click', function (e) {
                showMiniPopupProfile(groupProfileInfo($(this), true, false));
                $(".highlighted").removeClass("highlighted");
                $(this).addClass("highlighted");
            });
            
            $(".my-lectures-hdr").after(newElem);

            i++;
        }
    };

     /**
     * Get all applications from API and routes them to the insertApplication function
     * @return {None}
     */
    var displayApplications = function () {

        var onSuccess = function (data) {
            appliedApplications = [];   //reset the array to zero
            acceptedApplications = [];

            var i = 0;
            while (data.applications[i]) {

                //put the retreived applications in the corrosponding variables
                if (data.applications[i].appAccepted == 'true') { acceptedApplications.push(data.applications[i]); }
                else { appliedApplications.push(data.applications[i]); }

                i++;
            }
            appliedApplications.sort(sortBy("created_at", appliedAppTimeOrder));
            insertAcceptedApplications();
            insertAppliedApplications();
        };
        var onFailure = function () {
            console.error('display applications failed');
        };
        makeGetRequest('/api/applications?space=' + appSpace, onSuccess, onFailure);
    };

    /**
     * Get all lectures for that user from API and routes them to get inserted into the lectures table
     * @return {None}
     */
    var displayLectures = function () {

        var onSuccess = function (data) {
            myLectures = [];   //reset the array to zero

            var i = 0;
            while (data.lectures[i]) {
                myLectures.push(data.lectures[i]);
                i++;
            }
            insertLectures();
        };
        var onFailure = function () {
            console.error('display lectures failed');
        };

        var searchCriteria = "";

        if (me.type == 'student') {
            if ($(".search-form-dropdown-class-names option:selected").text() != "All") {
                searchCriteria += "&className=" + $(".search-form-dropdown-class-names option:selected").text();
            }
            if ($(".search-form-teacher-name-textbox").val().length > 0) {
                //searchCriteria += "&teacherName=" + $(".search-form-teacher-name-textbox").text().replace(/ /g, "_");

                searchCriteria += "&teacherName=" + encodeURIComponent($(".search-form-teacher-name-textbox").val());
            }
        }

        makeGetRequest('/api/lectures?space=' + appSpace + searchCriteria, onSuccess, onFailure);
    };

     /**
     * Whenever any of the headers of the applied applications table are clicked, it will update the table with the according sort
     * @return {None}
     */
    var clickedAppliedApplicationTableHeaders = function () {

        //sort them according to the teacher name when the teacher name button was clicked
        $(".curApp-userName-hdr").on('click', function (e) {
            if (me.type == 'teacher') { appliedApplications.sort(sortBy("studentName", appliedUserNameOrder)); }
            else { appliedUserNameOrder.sort(sortBy("lecture_teacherName", appliedUserNameOrder)); }
            
            appliedUserNameOrder = appliedUserNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

        //sort them according to the class name when the class name button was clicked
        $(".curApp-className-hdr").on('click', function (e) {
            appliedApplications.sort(sortBy("className", appliedClassNameOrder));
            appliedClassNameOrder = appliedClassNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

        //sort them according to the class time when the class time button was clicked
        $(".curApp-classTime-hdr").on('click', function (e) {
            appliedApplications.sort(sortBy("classTime", appliedClassTimeOrder));
            appliedClassTimeOrder = appliedClassTimeOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

        //sort them according to the class days when the class days button was clicked
        $(".curApp-classDays-hdr").on('click', function (e) {
            appliedApplications.sort(sortBy("classDays", appliedClassDaysOrder));
            appliedClassDaysOrder = appliedClassDaysOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

        //sort them according to if the lecture is open or not when the is closed button was clicked
        $(".curApp-appTime-hdr").on('click', function (e) {
            appliedApplications.sort(sortBy("created_at", appliedAppTimeOrder));
            appliedAppTimeOrder = appliedAppTimeOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

        //sort them according to if the lecture is open or not when the is closed button was clicked
        $(".curApp-isClosed-hdr").on('click', function (e) {
            appliedApplications.sort(sortBy("lecture_isClosed", appliedIsClosedOrder));
            appliedIsClosedOrder = appliedIsClosedOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".applied-applications-data").detach();
            insertAppliedApplications();
        });

    };

     /**
     * Whenever any of the headers of the accepted applications table are clicked, it will update the table with the according sort
     * @return {None}
     */
    var clickedAcceptedApplicationTableHeaders = function () {

        //sort them according to the teacher name when the teacher name button was clicked
        $(".accApp-userName-hdr").on('click', function (e) {
            if (me.type == 'teacher') { acceptedApplications.sort(sortBy("studentName", appliedUserNameOrder)); }
            else { acceptedApplications.sort(sortBy("lecture_teacherName", appliedUserNameOrder)); }
            
            acceptedUserNameOrder = acceptedUserNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".accepted-applications-data").detach();
            insertAcceptedApplications();
        });

        //sort them according to the class name when the class name button was clicked
        $(".accApp-className-hdr").on('click', function (e) {
            acceptedApplications.sort(sortBy("className", acceptedClassNameOrder));
            acceptedClassNameOrder = acceptedClassNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".accepted-applications-data").detach();
            insertAcceptedApplications();
        });

        //sort them according to the class time when the class time button was clicked
        $(".accApp-classTime-hdr").on('click', function (e) {
            acceptedApplications.sort(sortBy("classTime", acceptedClassTimeOrder));
            acceptedClassTimeOrder = acceptedClassTimeOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".accepted-applications-data").detach();
            insertAcceptedApplications();
        });

        //sort them according to the class days when the class days button was clicked
        $(".accApp-classDays-hdr").on('click', function (e) {
            acceptedApplications.sort(sortBy("classDays", acceptedClassDaysOrder));
            acceptedClassDaysOrder = acceptedClassDaysOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".accepted-applications-data").detach();
            insertAcceptedApplications();
        });

    }

    /**
     * Whenever any of the headers of the my lectures table are clicked, it will update the table with the according sort
     * @return {None}
     */
    var clickedMyLecturesTableHeaders = function () {

        //sort them according to the user name when the professor name button was clicked
        $(".opnApp-userName-hdr").on('click', function (e) {
            myLectures.sort(sortBy("teacherName", myLecturesUserNameOrder));
            myLecturesUserNameOrder = myLecturesUserNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".my-lectures-data").detach();
            insertLectures();
        });

        //sort them according to the class name when the class name button was clicked
        $(".opnApp-className-hdr").on('click', function (e) {
            myLectures.sort(sortBy("className", myLecturesClassNameOrder));
            myLecturesClassNameOrder = myLecturesClassNameOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".my-lectures-data").detach();
            insertLectures();
        });

        //sort them according to the class time when the class time button was clicked
        $(".opnApp-classTime-hdr").on('click', function (e) {
            myLectures.sort(sortBy("classTime", myLecturesClassTimeOrder));
            myLecturesClassTimeOrder = myLecturesClassTimeOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".my-lectures-data").detach();
            insertLectures();
        });

        //sort them according to the class days when the class days button was clicked
        $(".opnApp-classDays-hdr").on('click', function (e) {
            myLectures.sort(sortBy("classDays", myLecturesClassDaysOrder));
            myLecturesClassDaysOrder = myLecturesClassDaysOrder * -1;     //every time you click the button to will change to either ascending or descending
            $(".my-lectures-data").detach();
            insertLectures();
        });
    }

    var profileClickHandlers = function (e) {

        $('.section-header').not('.my-button').on('click', function (e) {
            //these if and else statments are used to close a different section and open the one you clicked (or close the current one you clicked if that is open)
            if ($(this).hasClass('active')) {
                $(this).toggleClass('active');
            }
            else {
                $('.edit-profile-page-wrapper').find('.active').toggleClass('active');
                $(this).toggleClass('active');
            }
        });

        $('.my-button').on('click', function (e) {
            $(this).parents('.section-header').toggleClass('active');   //just doing this so the section doesnt minimize when you click a button
        });

        $('.save-picture-button').on('click', function (e) {
            var picture = document.getElementById("file_input").files[0];
            if (!picture) {
                return alert("No file selected.");
            }
            getSignedRequest(picture);
        });

        $('.save-bio-button').on('click', function (e) {
            var errorString = "";
            if ($('.edit-bio-textbox').val().length > 256) { errorString = errorString + "Bio cannot be longer than 256 characters\n" }
            if (errorString != "") { alert(errorString); return; }

            var newBioData = {};
            newBioData.bio = $('.edit-bio-textbox').val();

            var onSuccess = function (data) {
                $('.edit-bio-textbox').text(data.profile.bio);
            };

            var onFailure = function () {
                console.error('Update user bio failed');
            };
            makePostRequest('/api/profile/bio', newBioData, onSuccess, onFailure);
        });

        $('.save-notifications-button').on('click', function (e) {
            var notificationData = {};
            if ($(".notification-checkbox").is(':checked')) { notificationData.receiveNotifications = "True"; }
            else { notificationData.receiveNotifications = "False"; }

            var onSuccess = function (data) {
                if (data.profile.receiveNotifications == "True") { $(".notification-checkbox").attr('checked', true); }
                else { $(".notification-checkbox").attr('checked', false); }
            };

            var onFailure = function () {
                console.error('Update user notification settings failed');
            };
            makePostRequest('/api/profile/notifications', notificationData, onSuccess, onFailure);
        });

        $('.profile-button').on('click', function (e) {
            e.preventDefault();

            $(".mini-profile-container").removeClass("show-mini-profile");
            $(".highlighted").removeClass("highlighted");
            $('.mainbody').toggleClass('blured');
            $('.profile-section').toggle();
            $('.edit-profile-page-wrapper').toggleClass('show-profile');
            $('.create-lecture-wrapper').removeClass('show-create-lecture');

            if (profileToggler == 0) {
                loadMyInfo();
                profileToggler = 1;
            }
        });

        $('.profile-section').on('click', function (e) {
            $('.mainbody').removeClass('blured');
            $('.profile-section').hide();
            $('.edit-profile-page-wrapper').removeClass('show-profile');
            $('.create-lecture-wrapper').removeClass('show-create-lecture');
        });

        if (me.type == 'student') {
            watchingClassesTemplate.find('.delete-watch-class-button').on('click', function (e) {
                $(this).parents('.add-watch-class-entry').detach();
            });

            takenClassesTemplate.find('.delete-class-button').on('click', function (e) {
                $(this).parents('.add-class-entry').detach();
            });

            savedWatchingClassesTemplate.find('.delete-saved-watch-class-button').on('click', function (e) {
                watchedClassesToDelete.push({ className: $(this).parents('.saved-watch-class-entry').find('.class-name').text() }); //put it into the array for deleting (to the api)
                $(this).parents('.saved-watch-class-entry').detach();
            });

            savedTakenClassesTemplate.find('.delete-saved-class-button').on('click', function (e) {
                takenClassesToDelete.push({ className: $(this).parents('.saved-class-entry').find('.class-name').text(), grade: $(this).parents('.saved-class-entry').find('.class-grade').text() });    //put it into the array for deleting (to the api)
                $(this).parents('.saved-class-entry').detach();
            });

            $('.add-class-button').on('click', function (e) {
                takenClassesTemplate.clone(true).appendTo(".edit-courses-taken-section");
            });

            $('.add-watching-button').on('click', function (e) {
                watchingClassesTemplate.clone(true).appendTo(".edit-watch-for-courses-section");
            });

            $('.save-classes-button').on('click', function (e) {
                $(".add-class-entry").each(function (index) {
                    takenClassesToAdd.push({ className: $(this).find('.dropdown-class-names option:selected').text(), grade: $(this).find('.dropdown-grades option:selected').text() });
                });
                //get things ready for the post request
                var takenClassesData = {};
                takenClassesData.add = takenClassesToAdd;
                takenClassesData.remove = takenClassesToDelete;

                var onSuccess = function (data) {
                    $(".add-class-entry").detach();
                    $('.saved-class-entry').detach();

                    insertTakenClasses(data.profile.taken);

                    takenClassesToDelete = [];
                    takenClassesToAdd = [];
                };
                var onFailure = function () {
                    console.error('saving taken classes failed');
                };
                makePostRequest('/api/profile/taken', takenClassesData, onSuccess, onFailure);
            });

            $('.save-watching-button').on('click', function (e) {
                $(".add-watch-class-entry").each(function (index) {
                    watchedClassesToAdd.push({ className: $(this).find('.dropdown-class-names option:selected').text() });
                });
                //get things ready for the post request
                var watchedClassesData = {};
                watchedClassesData.add = watchedClassesToAdd;
                watchedClassesData.remove = watchedClassesToDelete;

                var onSuccess = function (data) {
                    $(".add-watch-class-entry").detach();
                    $('.saved-watch-class-entry').detach();

                    insertWatchedClasses(data.profile.watching);

                    watchedClassesToDelete = [];
                    watchedClassesToAdd = [];
                };
                var onFailure = function () {
                    console.error('saving watched classes failed');
                };
                makePostRequest('/api/profile/watch', watchedClassesData, onSuccess, onFailure);
            });
        }
    }

    var popupProfileClickHandlers = function (e) {

        $('.mini-profile-close-button').on('click', function (e) {
            //hides the mini profile window
            $(".highlighted").removeClass("highlighted");
            $(".mini-profile-container").removeClass("show-mini-profile");
        });
    }

    var lectureSearchClickHandlers = function (e) {

        searchButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Search");
        backButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Back");

        searchButton.on('click', function (e) {
            $(".my-lectures-data").detach();
            displayLectures();
        });

        backButton.on('click', function (e) {
            //hide the tables and all that other jazz at some point
            $(".mini-profile-container").removeClass("show-mini-profile");
            $(".highlighted").removeClass("highlighted");
            $('.search-form').hide();
            $('.searched-lectures').hide();
            $('.accepted-applications').show();
            $('.applied-applications').show();
            $('.page-header-home-button').hide();
            $('.page-header-search-button').show();
        });

        $('.page-header-home-button').on('click', function (e) {
            e.preventDefault();
            $(".mini-profile-container").removeClass("show-mini-profile");
            $(".highlighted").removeClass("highlighted");
            $('.search-form').hide();
            $('.searched-lectures').hide();
            $('.accepted-applications').show();
            $('.applied-applications').show();
            $('.page-header-home-button').hide();
            $('.page-header-search-button').show();
        });

        $('.page-header-search-button').on('click', function (e) {
            e.preventDefault();
            $(".mini-profile-container").removeClass("show-mini-profile");
            $(".highlighted").removeClass("highlighted");
            $('.search-form').show();
            $('.searched-lectures').show();
            $('.accepted-applications').hide();
            $('.applied-applications').hide();
            $('.page-header-search-button').hide();
            $('.page-header-home-button').show();
            
        });

        $(".search-from-inputs").after(backButton)
        $(".search-from-inputs").after(searchButton)
    }

    var createLectureClickHandlers = function (e) {

        createButton = popupProfileButtonTemplate.clone(true).addClass("put-to-right").text("Create");
        backButton = popupProfileButtonTemplate.clone(true).addClass("put-to-left").text("Back");

        $(".start-am").on('click', function (e) {
            $(".start-pm").prop("checked", false);
        });

        $(".start-pm").on('click', function (e) {
            $(".start-am").prop("checked", false);
        });

        $(".finish-am").on('click', function (e) {
            $(".finish-pm").prop("checked", false);
        });

        $(".finish-pm").on('click', function (e) {
            $(".finish-am").prop("checked", false);
        });

        $(".lab-checkbox").on('click', function (e) {
            if ($(".lab-checkbox").is(':checked')) { $('.lab-section-container').show(); }
            else { $('.lab-section-container').hide(); }
        });

        $('.create-lecture-button').on('click', function (e) {
            //shows or hides the create lecture window
            e.preventDefault();
            $(".mini-profile-container").removeClass("show-mini-profile");
            $(".highlighted").removeClass("highlighted");
            $('.mainbody').toggleClass('blured');
            $('.profile-section').toggle();
            $('.create-lecture-wrapper').toggleClass('show-create-lecture');
        });

        backButton.on('click', function (e) {
            //close the create lecture window
            $('.mainbody').removeClass('blured');
            $('.profile-section').hide();
            $('.create-lecture-wrapper').removeClass('show-create-lecture');
            $('.create-lecture-form')[0].reset();
            $('.lab-section-container').hide();
        });

        createButton.on('click', function (e) {
            //creates a lecture witht he user inputted data

            var errorString = "";

            if ($('.class-start-time').val().length == 0) { errorString = errorString + "Class start time cannot be empty\n"; }
            if ($('.class-start-time').val().length > 5) { errorString = errorString + "Class start time cannot be longer than 5 characters\n"; }
            if ($('.class-finish-time').val().length == 0) { errorString = errorString + "Class finish time cannot be empty\n"; }
            if ($('.class-finish-time').val().length > 5) { errorString = errorString + "Class finish time cannot be longer than 5 characters\n"; }
            //ADD MORE TEST CASES 

            if (errorString != "") { alert(errorString); return; }

            var newLecture = {}; //prepare the lecture object to send to server
            newLecture.space = appSpace;

            newLecture.className = $(".dropdown-class-names option:selected").text();

            if ($(".lab-checkbox").is(':checked')) {
                //if it was checked as a lab, mark it as a lab
                newLecture.className += "-Lab" + $(".dropdown-lab-section option:selected").val();
            }

            newLecture.classTime = $('.class-start-time').val();

            if ($(".start-am").is(':checked')) { newLecture.classTime += "am"; }
            else { newLecture.classTime += "pm"; }
            newLecture.classTime += "-";
            newLecture.classTime += $('.class-finish-time').val();
            if ($(".finish-am").is(':checked')) { newLecture.classTime += "am"; }
            else { newLecture.classTime += "pm"; }

            newLecture.classDays = "";
            if ($(".sun-check").is(':checked')) { newLecture.classDays += "Sun"; }
            if ($(".m-check").is(':checked')) { newLecture.classDays += "M"; }
            if ($(".tu-check").is(':checked')) { newLecture.classDays += "Tu"; }
            if ($(".w-check").is(':checked')) { newLecture.classDays += "W"; }
            if ($(".th-check").is(':checked')) { newLecture.classDays += "Th"; }
            if ($(".f-check").is(':checked')) { newLecture.classDays += "F"; }
            if ($(".sat-check").is(':checked')) { newLecture.classDays += "Sat"; }

            newLecture.wantedTAs = $(".dropdown-wanted-tas option:selected").val();

            var onSuccess = function (data) {
                alert("Successfully created lecture");

                $('.mainbody').removeClass('blured');
                $('.profile-section').hide();
                $('.create-lecture-wrapper').removeClass('show-create-lecture');
                $('.create-lecture-form')[0].reset();
                $('.lab-section-container').hide();

                //now update the tables:
                myLectures.unshift(data.lectures);
                $(".my-lectures-data").detach();
                displayLectures();
            };
            var onFailure = function () {
                console.error('create lecture failed');
            };

            makePostRequest('/api/lectures', newLecture, onSuccess, onFailure);

        });

        $(".create-lecture-form").after(backButton);
        $(".create-lecture-form").after(createButton);
    }

    var start = function (current_user) {
        me = current_user;

        

        $('.search-form').hide();
        $('.searched-lectures').hide();

        $('.profile-section').hide();
        $('.page-header-home-button').hide();
        //grab the first applied application out of the applied applications table to use as a template
        appliedApplicationsTemplate = $(".applied-applications-data");

        //grab the first accepted application out of the accepted applications table to use as a template
        acceptedApplicationsTemplate = $(".accepted-applications-data");

        //myLecturesTemplate = $(".my-lectures-table .my-lectures-data")[0].outerHTML;
        myLecturesTemplate = $(".my-lectures-data");

        //delete the data rows from the tables
        $(".applied-applications-data").detach();     
        $(".accepted-applications-data").detach();
        $(".my-lectures-data").detach();

        takenClassesTemplate = $(".add-class-entry");
        watchingClassesTemplate = $(".add-watch-class-entry");

        savedTakenClassesTemplate = $(".saved-class-entry");
        savedWatchingClassesTemplate = $(".saved-watch-class-entry");

        $(".add-class-entry").detach();
        $(".add-watch-class-entry").detach();

        $(".saved-class-entry").detach();
        $(".saved-watch-class-entry").detach();





        popupProfileButtonTemplate = $(".mini-profile-button");

        popupProfileTakenClassContainer = $(".mini-profile-classes-taken-container");
        popupProfileClassInfoContainer = $(".mini-profile-class-info-container");
        popupProfileBioContainer = $(".mini-profile-bio-container");

        popupProfileTakenClassTemplate = $(".mini-profile-classes-taken-container").find(".mini-profile-class-info-list-entry");
        $(".mini-profile-classes-taken-container").find(".mini-profile-class-info-list-entry").detach();

        detatchMiniPopupProfileStuff();
        
        clickedAppliedApplicationTableHeaders();
        clickedAcceptedApplicationTableHeaders();
        clickedMyLecturesTableHeaders();
        popupProfileClickHandlers();
        profileClickHandlers();
        displayApplications();

        if (me.type == 'teacher') {
            $('.lab-section-container').hide();
            createLectureClickHandlers();
            displayLectures();
        }
        else {
            lectureSearchClickHandlers();
        }
        
        
    };
    


    return {
        start: start
    };
    
})();

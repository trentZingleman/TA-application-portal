from flask import Flask, jsonify, request, render_template, url_for, redirect, session, flash
from flask_login import login_user , logout_user , current_user , login_required, LoginManager
from flask_cors import CORS
from flask_mail import Mail, Message
from threading import Thread
from itsdangerous import URLSafeTimedSerializer
import flask_sqlalchemy as sqlalchemy
from sqlalchemy import desc
import datetime
import os, json, boto3
import sys
import time
import urllib.parse

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sqlalchemy-demo.db'
app.config['SECRET_KEY'] = /HIDDEN/

AWS_ACCESS_KEY_ID = /HIDDEN/
AWS_SECRET_ACCESS_KEY = /HIDDEN/
S3_BUCKET = /HIDDEN/

s3 = boto3.client(
        's3',
        aws_access_key_id=/HIDDEN/,
        aws_secret_access_key=/HIDDEN/,
        region_name='us-west-2'
    )

app.config.update(dict(
	MAIL_SERVER = 'smtp.gmail.com',
	MAIL_PORT = 465,
	MAIL_USE_SSL = True,
	MAIL_USERNAME = /HIDDEN/,
	MAIL_PASSWORD = /HIDDEN/,
        MAIL_DEFAULT_SENDER = /HIDDEN/
	))
mail = Mail(app)

db = sqlalchemy.SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)

serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

base_url = '/api/'

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(128), unique=True)
    password = db.Column(db.String(64))
    name = db.Column(db.String(64))
    type = db.Column(db.String(64))
    bio = db.Column(db.String(256))
    pictureURL = db.Column(db.String(128), default=/HIDDEN/)
    receiveNotifications = db.Column(db.Boolean, default=True)
    authenticated = db.Column(db.Boolean, default=False)
    __mapper_args__ = {
        'polymorphic_on': type,
        'polymorphic_identity': 'user'
    }

    def __init__(self, email, password, name):
        self.email = email
        self.password = password
        self.name = name

    def __repr__(self):
        return '<User %r>' % self.id

    #used for Flask-login:
    def is_authenticated(self):
        return self.authenticated
    def is_active(self):
        return True
    def is_anonymous(self):
        return False
    def get_id(self):
        return str(self.id)

    

class Student(User):
    #__table_args__ = {'extend_existing': True}
    __mapper_args__ = {
        'polymorphic_identity': 'student'
    }

class Teacher(User):
    #__table_args__ = {'extend_existing': True}
    __mapper_args__ = {
        'polymorphic_identity': 'teacher'
    }


class TakenCourse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    className = db.Column(db.String(64))
    grade = db.Column(db.String(3))
    student_id = db.Column(db.Integer)

    def __init__(self, grade, className, student_id):
        self.grade = grade
        self.className = className
        self.student_id = student_id

class FollowCourse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    className = db.Column(db.String(64))
    student_id = db.Column(db.Integer)

    def __init__(self, className, student_id):
        self.className = className
        self.student_id = student_id

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer)
    teacher_id = db.Column(db.Integer)
    space = db.Column(db.String(64))
    studentName = db.Column(db.String(64))
    className = db.Column(db.String(64))
    classTime = db.Column(db.String(64))
    classDays = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    lecture_id = db.Column(db.Integer)
    lecture_teacherName = db.Column(db.String(64))
    appAccepted = db.Column(db.String(10), default="false")
    lecture_isClosed = db.Column(db.String(10))

class Lecture(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer)
    space = db.Column(db.String(64))
    teacherName = db.Column(db.String(64))
    className = db.Column(db.String(64))
    classTime = db.Column(db.String(64))
    classDays = db.Column(db.String(10))
    wantedTAs = db.Column(db.Integer)
    currentTAs = db.Column(db.Integer, default=0)
    lectureAccepted = db.Column(db.String(10), default="false")



#if a user uploads a new picture, the old picture should be deleted so this function is called
def deletePictureThread(pictureURL):
    with app.app_context():
        try:
            s3.delete_object(
                Bucket=/HIDDEN/,
                Key=/HIDDEN/ % str(pictureURL.rpartition('/')[-1])
            )
            print('Successfully deleted old picture from S3 bucket', file=sys.stderr)
        except:
            print('Could not delete old picture from S3 bucket', file=sys.stderr)

#function that starts a new thread to delete a picture from the amazon S3 bucket
def deletePicture(pictureURL):
    try:
        Thread(target=deletePictureThread, args=(pictureURL, )).start()
        print('Started thread to delete picture', file=sys.stderr)
    except:
        print('Could not start thread to delete picture', file=sys.stderr)


#for flask-login
#given the user id it will return that user
@login_manager.user_loader
def load_user(id):
    return User.query.filter_by(id = id).first()


#for threading to send email in background
def send_message(msg):
    with app.app_context():
        mail.send(msg)
        print('sent email', file=sys.stderr)


#utilizes multithreading to send emails simutaneously while app is running
def newEmail(msg):
    try:
        Thread(target=send_message, args=(msg, )).start()
        print('Started email thread', file=sys.stderr)
    except:
        print('Could not start email thread', file=sys.stderr)
        return 'could not send email'


def sendEmailToFollowers(className):
    studentsFollowing = FollowCourse.query.filter(FollowCourse.className.like(className + "%")).all()
    emailRecipients = set()

        #get the emails of all students following that class
    for s in studentsFollowing:
        curStudent = Student.query.get(s.student_id)
        if curStudent.receiveNotifications:
            emailRecipients.add(curStudent.email)

    webpageURL = url_for('index')
    emailSubject = "WSU TA Portal: Heads up, open TA positions for " + className + " have been posted!"
    body = "Open TA positions for " + className + " have been posted. For more details, click the following link and log in:\n" + webpageURL

    for email in emailRecipients:
        curStudent = Student.query.filter_by(email = email).first()
        msg = Message(emailSubject, recipients=[email])
        msg.body = body
        msg.html = render_template('email.html', 
                                   subhead = 'WSU TA Portal',
                                   h1 = 'New Position Available!',
                                   greeting = 'Hello ' + curStudent.name.split(' ', 1)[0],
                                   bodycopy = 'This is an automatic email notifying you that there is a new TA position available for ' + className + '. Log into your account to view more details',
                                   bttnTxt = 'Log in',
                                   url = webpageURL)
        newEmail(msg)

#generate token for email confirmation
def generateEmailConfirmationToken(email):
    return serializer.dumps(email, salt='email-confirmation-salter')


def confirmEmailToken(token, expiration = 7200):
    try:
        email = serializer.loads(token, salt='email-confirmation-salter', max_age=expiration)
    except:
        return None
    return email


@app.route('/')
def index():

    if not current_user.is_authenticated:
        return render_template('loginPage.html')    #if the current user isnt signed in, show the loginPage
    
    return render_template('index.html', current_user = profile_to_obj(current_user))


@app.route('/login', methods=['GET','POST'])
def login():

    if request.method == 'GET':
        return render_template('loginPage.html')
    elif request.method == 'POST':
        loginAttempt = request.get_json()
        user = User.query.filter_by(email = loginAttempt['email']).first()
        if user:
            if user.password == loginAttempt['password']:
                if user.authenticated:
                    if loginAttempt['rememberMe'] == 'true':
                        #the user selected that they want to be remembered (inserts a cookie)
                        login_user(user, remember=True)
                    else:
                        login_user(user)
                    return jsonify({"status": 1, "redirect": url_for('index')}), 200
                else:
                    print('User not authenticated yet', file=sys.stderr)
                    return 'User not authenticated yet'
            else:
                print('Wrong password', file=sys.stderr)
                flash('Wrong password!')
        else:
            print('Email doesnt exist', file=sys.stderr)
            flash('Email does not exist!')
    return 'ok'


@app.route('/logout', methods=['GET'])
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/search', methods=['GET'])
@login_required
def search():
    return render_template('searchPage.html')

@app.route('/result', methods=['GET', 'POST'])
@login_required
def result():
    print('Hello!')
    sname = { 'user': current_user.id }
    return render_template('resultTable.html', cname = sname)



@app.route('/createAcct', methods=['POST'])
def createAcct():

    newUser = request.get_json()
    user = User.query.filter_by(email = newUser['email']).first() #check to see if email is in use
    
    if user:
        return 'email already in use!'
    else:
        if newUser['isStudent'] == 'true':
            createUser = Student(email = newUser['email'], password = newUser['password'], name = newUser['name'])
            print('created student', file=sys.stderr)
        else:
            createUser = Teacher(email = newUser['email'], password = newUser['password'], name = newUser['name'])
            print('created teacher', file=sys.stderr)
        
        db.session.add(createUser)
        db.session.commit()

        token = generateEmailConfirmationToken(createUser.email)
        authenticationURL = url_for('confirmUserEmail', token=token, _external=True)
        msg = Message("WSU TA Portal: account authentication email", recipients=[createUser.email])
        msg.body = "Click the following link to confirm your email:\n" + authenticationURL
        msg.html = render_template('email.html', 
                                   subhead = 'Welcome to',
                                   h1 = 'WSU TA Portal',
                                   greeting = 'Thanks for registering ' + createUser.name.split(' ', 1)[0],
                                   bodycopy = 'All you need to do now is verify you account. Click the button below and you\'re all set! When verified, go ahead and log in!',
                                   bttnTxt = 'Confirm Registration',
                                   url = authenticationURL)
        newEmail(msg)
        

        messageStr = 'Please click the confirmation link sent to ' + createUser.email
        return jsonify({"status": 1, "message": messageStr}), 200
    return 'something went wrong'


@app.route('/confirm/<token>')
def confirmUserEmail(token):
    try:
        email = confirmEmailToken(token)
    except:
        return 'Link expired'

    user = User.query.filter_by(email=email).first()

    if user is None:
        return 'Account does not exist'

    if user.authenticated:
        return 'User already authenticated'
    else:
        user.authenticated = True
        db.session.add(user)
        db.session.commit()
        flash('Thank you for authenticating your account, please log in', 'success')

    return redirect(url_for('login'))




#get_applications
#loads a list of applications with the given parameters in the URL:
    #space (required)
    #count
    #studentName
    #className
    #classDays
    #appAccepted
    #order_param
    #order_by
@app.route(base_url + 'applications', methods=["GET"])
@login_required
def get_applications():
    spaceval = request.args.get('space', None)

    if spaceval is None:
        return "Must provide space", 501
    elif len(spaceval) > 64:
        return "Space cannot be longer than 64 characters", 502

    countval = request.args.get('count', None)
    studentnameval = request.args.get('studentName', None)
    classnameval = request.args.get('className', None)
    classdaysval = request.args.get('classDays', None)
    appacceptedval = request.args.get('appAccepted', None)
    order_paramval = request.args.get('order_param', None)
    order_byval = request.args.get('order_by', None)
    
    if ((appacceptedval != "true") and (appacceptedval != "false") and (appacceptedval is not None)):
        return "appAccepted must be one of the following strings (or not used): true or false", 503

    if order_paramval is None:
        order_paramval = "className"
        
    if order_paramval == "teacherName":
       order_paramval = "lecture_teacherName"

    if order_paramval == "isClosed":
        order_paramval = "lecture_isClosed"

    if (order_paramval != "teacherName") and (order_paramval != "className") and (order_paramval != "classDays") and (order_paramval != "lectureAccepted") and (order_paramval != "lecture_teacherName") and (order_paramval != "lecture_isClosed"):
        return "order_param must be one of the following strings (or not used): teacherName, className, classDays, or lectureAccepted or teacherName or isClosed", 504
    
    if (order_byval != "desc") and (order_byval != "asc") and (order_byval is not None):
        return "order_by must be one of the following strings (or not used): desc or asc", 505


    searchInputs = {}
    searchInputs['space'] = spaceval
        
    if current_user.type == 'student':
        searchInputs['student_id'] = current_user.id
        
    if current_user.type == 'teacher':
        searchInputs['teacher_id'] = current_user.id
    
    if studentnameval is not None:
        searchInputs['studentName'] = studentnameval

    if classnameval is not None:
        searchInputs['className'] = classnameval

    if classdaysval is not None:
        searchInputs['classDays'] = classdaysval

    if appacceptedval is not None:
        searchInputs['appAccepted'] = appacceptedval

    if (order_byval == "desc") or (order_byval is None):
        applicationList = Application.query.filter_by(**searchInputs).order_by(getattr(Application, order_paramval).desc())
    else:
        applicationList = Application.query.filter_by(**searchInputs).order_by(getattr(Application, order_paramval))

    if (countval == "all") or (countval is None):
        applicationList = applicationList.all()
    else:
        applicationList = applicationList.limit(int(countval)).all()        

    
    applicationResults = []
    for row in applicationList:
        applicationResults.append(applicationRow_to_obj(row))

    return jsonify({"status": 1, "applications": applicationResults})


#get_lectures
#loads a list of lectures with the given parameters in the URL:
    #space (required)
    #count
    #teacherName
    #className
    #classDays
    #lectureAccepted
    #order_param (will use "classname" by default)
    #order_by (will use "desc" by default)
@app.route(base_url + 'lectures', methods=["GET"])
@login_required
def get_lectures():
    spaceval = request.args.get('space', None)

    if spaceval is None:
        return "Must provide space", 501
    elif len(spaceval) > 64:
        return "Space cannot be longer than 64 characters", 502

    countval = request.args.get('count', None)
    teachernameval = request.args.get('teacherName', None)
    classnameval = request.args.get('className', None)
    classdaysval = request.args.get('classDays', None)
    lectureacceptedval = request.args.get('lectureAccepted', None)
    order_paramval = request.args.get('order_param', None)
    order_byval = request.args.get('order_by', None)

    if (lectureacceptedval != "true") and (lectureacceptedval != "false") and (lectureacceptedval is not None):
        return "lectureAccepted must be one of the following strings (or not used): true or false", 503

    if order_paramval is None:
        order_paramval = "className"

    if (order_paramval != "teacherName") and (order_paramval != "className") and (order_paramval != "classDays") and (order_paramval != "lectureAccepted"):
        return "order_param must be one of the following strings (or not used): teacherName, className, classDays, or lectureAccepted", 504
    
    if (order_byval != "desc") and (order_byval != "asc") and (order_byval is not None):
        return "order_by must be one of the following strings (or not used): desc or asc", 505

    searchInputs = {}
    searchInputs['space'] = spaceval

    if current_user.type == 'teacher':
        searchInputs['teacher_id'] = current_user.id

    if teachernameval is not None:
        searchInputs['teacherName'] = teachernameval

    if classdaysval is not None:
        searchInputs['classDays'] = classdaysval

    if lectureacceptedval is not None:
        searchInputs['lectureAccepted'] = lectureacceptedval

    if (order_byval == "desc") or (order_byval is None):
       lectureList = Lecture.query.filter_by(**searchInputs).order_by(getattr(Lecture, order_paramval).desc())
    else:
        lectureList = Lecture.query.filter_by(**searchInputs).order_by(getattr(Lecture, order_paramval))

    if classnameval is not None:
        lectureList = lectureList.filter(Lecture.className.like(classnameval + "%"))

    if (countval == "all") or (countval is None):
        lectureList = lectureList.all()
    else:
        lectureList = lectureList.limit(int(countval)).all()



    lectureResults = []
    for row in lectureList:
        lectureResults.append(lectureRow_to_obj(row))
        
    return jsonify({"status": 1, "lectures": lectureResults})
    


#show_single_lecture
#loads a single lecture with the given id as a value in the URL
@app.route(base_url + 'lectures/<int:id>', methods=["GET"])
def show_single_lecture(id):
    requestedLecture = Lecture.query.get(id)
    return jsonify({"status": 1, "lectures": lectureRow_to_obj(requestedLecture)}), 200

#show_single_application
#loads a single application with the given id as a value in the URL
@app.route(base_url + 'applications/<int:id>', methods=["GET"])
def show_single_application(id):
    requestedApplication = Application.query.get(id)
    return jsonify({"status": 1, "applications": applicationRow_to_obj(requestedApplication)}), 200

#accept_application
#will accept a particular application (with the given ID) to the corrosponding Lecture
@app.route(base_url + 'applications/<int:application_id>/accept', methods=["POST"])
@login_required
def accept_application(application_id):
    if current_user.type == 'student':
        return 'Only teachers can accept an application'
    
    acceptingApplication = Application.query.get(application_id)

    if acceptingApplication is None:
        return 'Application does not exist'

    if acceptingApplication.teacher_id != current_user.id:
        return 'You can only accept applications regarding your own lecture'

    acceptingLecture = Lecture.query.get(acceptingApplication.lecture_id)

    if acceptingLecture.lectureAccepted == "true":
        return 'Cannot accept application, Lecture already full'

    acceptingApplication.appAccepted = "true"
    acceptingLecture.currentTAs += 1

    acceptedStudent = Student.query.get(acceptingApplication.student_id)

    if acceptedStudent.receiveNotifications:
        logInURL = url_for('index')
        msg = Message("WSU TA Portal: Your TA application was accepted for class " + acceptingApplication.className, recipients=[acceptedStudent.email])
        msg.body = "Click the following link to log into your account and view more information:\n" + logInURL
        msg.html = render_template('email.html', 
                                   subhead = 'WSU TA Portal',
                                   h1 = 'You got Accepted!',
                                   greeting = 'Congratulations ' + acceptedStudent.name.split(' ', 1)[0],
                                   bodycopy = 'Your application to become a TA for ' + acceptingApplication.lecture_teacherName + '\'s ' + acceptingApplication.className + ' has been accepted! Log into your account to view more details',
                                   bttnTxt = 'Log in',
                                   url = logInURL)
        newEmail(msg)


    if acceptingLecture.wantedTAs >= acceptingLecture.currentTAs:
        acceptingLecture.lectureAccepted = "true"

        lectureApplications = Application.query.filter_by(lecture_id = acceptingApplication.lecture_id)

        for row in lectureApplications:
            lectureApplications.lecture_isClosed = "true"

    db.session.commit()

    return jsonify({"status": 1}), 200

#create_application
#creates an application to a particular lecture with the given ID
@app.route(base_url + 'lectures/<int:lecture_id>/apply', methods=["POST"])
@login_required
def create_application(lecture_id):
    if current_user.type == 'teacher':
        return 'Only students can apply to be a TA'

    applyToLecture = Lecture.query.get(lecture_id)

    if applyToLecture is None:
        return 'Lecture does not exist'

    newApplicationParams = {
                                "lecture_id": lecture_id,
                                "student_id": current_user.id
        }

    doesApplicationExistAlready = Application.query.filter_by(**newApplicationParams).first()

    if doesApplicationExistAlready is not None:
        return 'You already applied to be a TA for this lecture!'
    
    newApplicationParams.update({
                                "teacher_id": applyToLecture.teacher_id,
                                "space": applyToLecture.space,
                                "studentName": current_user.name,
                                "lecture_teacherName": applyToLecture.teacherName,
                                "className": applyToLecture.className,
                                "classTime": applyToLecture.classTime,
                                "classDays": applyToLecture.classDays,
                                "lecture_isClosed": applyToLecture.lectureAccepted
        })

    newApplication = Application(**newApplicationParams)

    teacherOfLecture = Teacher.query.get(newApplication.teacher_id)

    if teacherOfLecture.receiveNotifications:
        logInURL = url_for('index')
        msg = Message("WSU TA Portal: " + newApplication.studentName + " applied to " + newApplication.className, recipients=[teacherOfLecture.email])
        msg.body = "Click the following link to log into your account and view more information:\n" + logInURL
        msg.html = render_template('email.html', 
                                   subhead = 'WSU TA Portal',
                                   h1 = 'You Have A New Application',
                                   greeting = 'Hello ' + teacherOfLecture.name.split(' ', 1)[0],
                                   bodycopy = 'This is an automated message to inform you that ' + newApplication.studentName + ' applied to become a TA for your ' + newApplication.className + ' class. Log in to accept their application',
                                   bttnTxt = 'Log in',
                                   url = logInURL)
        newEmail(msg)
    
    db.session.add(newApplication)
    db.session.commit()
    db.session.refresh(newApplication)

    return jsonify({"status": 1, "applications": applicationRow_to_obj(newApplication)}), 200
    
#create_lecture
#creates a lecture with the given JSON parameters
#the JSON elements to input for a lecture are:
    #space
    #wantedTAs
    #className
    #classTime
    #classDays
@app.route(base_url + 'lectures', methods=['POST'])
@login_required
def create_lecture():
    if current_user.type == 'student':
        return 'Only teachers can create a lecture'
    
    newLectureParams = request.get_json()
    newLectureParams.update({"teacher_id": current_user.id, "teacherName": current_user.name})

    doesLectureExistAlready = Lecture.query.filter_by(**newLectureParams).first()

    if doesLectureExistAlready is not None:
        return 'You created this lecture already'
    
    newLecture = Lecture(**newLectureParams)

    sendEmailToFollowers(newLecture.className)
    
    db.session.add(newLecture)
    db.session.commit()
    db.session.refresh(newLecture)

    return jsonify({"status": 1, "lectures": lectureRow_to_obj(newLecture)}), 200

#delete_all_applications
#delete all application in a given space
@app.route(base_url + 'applications', methods=['DELETE'])
def delete_all_applications():
    spaceval = request.args.get('space', None) 

    if spaceval is None:
        return "Must provide space", 500
    elif len(spaceval) > 64:
        return "Space cannot be longer than 64 characters", 500

    query = Application.query.filter_by(space = spaceval).all()

    for row in query:
        db.session.delete(row)

    db.session.commit()

    return jsonify({"status": 1}), 200

#delete_all_lectures
#delete all lectures in a given space (this will also delete all applications)
@app.route(base_url + 'lectures', methods=['DELETE'])
def delete_all_lectures():
    spaceval = request.args.get('space', None) 

    if spaceval is None:
        return "Must provide space", 500
    elif len(spaceval) > 64:
        return "Space cannot be longer than 128 characters", 500

    applicationQuery = Application.query.filter_by(space = spaceval).all()
    lectureQuery = Lecture.query.filter_by(space = spaceval).all()

    for row in applicationQuery:
        db.session.delete(row)

    for row in lectureQuery:
        db.session.delete(row)

    db.session.commit()

    return jsonify({"status": 1}), 200

#delete_one_application
#delete one application with a given ID
@app.route(base_url + 'applications/<int:application_id>', methods=["DELETE"])
@login_required
def delete_one_application(application_id):
    applicationToDelete = Application.query.get(application_id)

    if applicationToDelete is None:
        return 'Application does not exist'
    
    if (current_user.type == 'student') and (applicationToDelete.student_id != current_user.id):
        return 'Students can only delete their own applications'

    if applicationToDelete.appAccepted == "true":
        acceptedLecture = Lecture.query.get(applicationToDelete.lecture_id)
        acceptedLecture.currentTAs -= 1

        if acceptedLecture.lectureAccepted == "true":
            lectureApplications = Application.query.filter_by(lecture_id = applicationToDelete.lecture_id)

            for row in lectureApplications:
                lectureApplications.lecture_isClosed = "false"

        acceptedLecture.lectureAccepted = "false"
        
    db.session.delete(applicationToDelete)
    
    db.session.commit()
    
    return jsonify({"status": 1}), 200

#delete_one_lecture
#delete one lecture with a given ID (this will also delete all applications associated with that particular lecture
@app.route(base_url + 'lectures/<int:lecture_id>', methods=["DELETE"])
@login_required
def delete_one_lecture(lecture_id):
    if current_user.type == 'student':
        return 'Only teachers can delete lectures'

    lectureToDelete = Lecture.query.get(lecture_id)

    if lectureToDelete is None:
        return 'Lecture does not exist'

    if lectureToDelete.teacher_id != current_user.id:
        return 'You can only delete your own lectures'

    db.session.delete(lectureToDelete)

    associatedApplications = Application.query.filter_by(lecture_id = lecture_id).all()

    for row in associatedApplications:
        db.session.delete(row)
    
    db.session.commit()

    return jsonify({"status": 1}), 200

#profile
#can get or delete a profile given a user id in the URL
@app.route(base_url + 'profile/<id>', methods=['GET','DELETE'])
@login_required
def profile(id):
    userProfile = User.query.get(id)
    if userProfile is None:
        return 'User does not exist'

    if request.method == 'GET':
        if (current_user.id != userProfile.id) and (current_user.type == userProfile.type):
            return 'Cannot give information of user same type as you'

        return jsonify({"status": 1, "profile": profile_to_obj(userProfile)}), 200

    if request.method == 'DELETE':
        if current_user.id != userProfile.id:
            return 'You can only delete your own profile'
        #add deleting methods here

#editProfileBio
#can update a profiles bio given a user id
#the JSON elements to input to update a profile bio are:
    #bio
@app.route(base_url + 'profile/bio', methods=['POST'])
@login_required
def editProfileBio():
    userProfileInfo = request.get_json()
    if (userProfileInfo is None) or (userProfileInfo['bio'] is None):
        return 'Must include a bio'

    current_user.bio = userProfileInfo['bio']
    db.session.commit()

    return jsonify({"status": 1, "profile": profile_to_obj(current_user)}), 200

#editStudentWatchList
#can add or remove classes to a students watch list
#the JSON elements to input to update a profile bio are:
    #add (a list of entries to add that contain):
        #className
    #remove (a list of entries to remove that contain):
        #className
@app.route(base_url + 'profile/watch', methods=['POST'])
@login_required
def editStudentWatchList():
    if current_user.type == 'teacher':
        return 'Only students can edit their watching classes list'

    watchListInfo = request.get_json()
    if (watchListInfo is None) or ((watchListInfo['add'] is None) and (watchListInfo['remove'] is None)):
        return 'must include class(es) to add or remove'

    for entry in watchListInfo['add']:
        searchForEntry = FollowCourse.query.filter_by(className = entry['className'], student_id = current_user.id).first()

        if searchForEntry is None:
            db.session.add(FollowCourse(className = entry['className'], student_id = current_user.id))

    for entry in watchListInfo['remove']:
        searchForEntry = FollowCourse.query.filter_by(className = entry['className'], student_id = current_user.id).first()

        if searchForEntry is not None:
            db.session.delete(searchForEntry)

    db.session.commit()
    return jsonify({"status": 1, "profile": profile_to_obj(current_user)}), 200


#editStudentTakenList
#can add or remove classes to a students taken list
#the JSON elements to input to update a profile bio are:
    #add (a list of entries to add that contain):
        #className
        #grade
    #remove (a list of entries to remove that contain):
        #className
        #grade
@app.route(base_url + 'profile/taken', methods=['POST'])
@login_required
def editStudentTakenList():
    if current_user.type == 'teacher':
        return 'Only students can edit their taken classes list'

    takenListInfo = request.get_json()
    if (takenListInfo is None) or ((takenListInfo['add'] is None) and (takenListInfo['remove'] is None)):
        return 'must include class(es) to add or remove'

    for entry in takenListInfo['add']:
        searchForEntry = TakenCourse.query.filter_by(className = entry['className'], grade = entry['grade'], student_id = current_user.id).first()

        if searchForEntry is None:
            db.session.add(TakenCourse(className = entry['className'], grade = entry['grade'], student_id = current_user.id))

    for entry in takenListInfo['remove']:
        searchForEntry = TakenCourse.query.filter_by(className = entry['className'], grade = entry['grade'], student_id = current_user.id).first()

        if searchForEntry is not None:
            db.session.delete(searchForEntry)

    db.session.commit()
    return jsonify({"status": 1, "profile": profile_to_obj(current_user)}), 200


#editNotificationSettings
#edits the notification settings of a user
#the JSON elements to input to update a profiles notifications are:
    #receiveNotifications
@app.route(base_url + 'profile/notifications', methods=['POST'])
@login_required
def editNotificationSettings():
    notificationChange = request.get_json()
    if (notificationChange is None) or (notificationChange['receiveNotifications'] is None):
        return 'Must include a notification setting'

    if notificationChange['receiveNotifications'] == 'True':
        current_user.receiveNotifications = True
    else:
        current_user.receiveNotifications = False

    db.session.commit()
    return jsonify({"status": 1, "profile": profile_to_obj(current_user)}), 200


#sign_s3
#creates an HTTP request for the current user to be able to upload to amazon s3 bucket
#the JSON elements to input to sign the file and create a request are:
    #file_type
@app.route(base_url + 'sign-file', methods=['POST'])
@login_required
def sign_s3():
    fileStuff = request.get_json();
    file_type = fileStuff['file_type']
    curTime = int(round(time.time() * 1000))    #use current system time for picture name (this makes all picture names unique)
    

    presigned_post = s3.generate_presigned_post(
        Bucket = 'wsutaportal',
        Key = 'profilepictures/%s' % str(curTime),
        Fields = {"acl": "public-read", "Content-Type": file_type},
        Conditions = [
            {"acl": "public-read"},
            {"Content-Type": file_type}
        ],
        ExpiresIn = 3600
    )

    return json.dumps({
        'data': presigned_post,
        'url': 'https://wsutaportal.s3.amazonaws.com/profilepictures/%s' %  str(curTime)
    })


   

#updatepicture
#updates the current users profile picture url after successfull upload to amazon s3 bucket
#the JSON elements to input to update a profile picture url are:
    #url
@app.route(base_url + 'profile/picture/update', methods=['POST'])
@login_required
def updatepicture():
    newProfileURL = request.get_json()

    if(current_user.pictureURL != 'https://wsutaportal.s3.amazonaws.com/profilepictures/default.jpg'):
        deletePicture(current_user.pictureURL)

    current_user.pictureURL = newProfileURL['url']
    db.session.commit()

    return jsonify({"status": 1, "profile": profile_to_obj(current_user)}), 200


#profile_to_obj
#convert a User (profile) into readable format for JSON
def profile_to_obj(profile):
    profileObj = {
                "id": profile.id,
                "type": profile.type,
                "email": profile.email,
                "name": profile.name,
                "bio": profile.bio,
                "pictureURL": profile.pictureURL
        }


    if (current_user.id == profile.id):
        profileObj['receiveNotifications'] = str(current_user.receiveNotifications)
        

    if (profile.type == 'student'):
        if (current_user.id == profile.id):
            watchingClassesObj = []
            watchingClasses = FollowCourse.query.filter_by(student_id = current_user.id).order_by(FollowCourse.className).all()

            for entry in watchingClasses:
                watchingClassesObj.append({"className": entry.className})

            profileObj['watching'] = watchingClassesObj

        takenClassesObj = []
        takenClasses = TakenCourse.query.filter_by(student_id = profile.id).order_by(TakenCourse.className).all()

        for row in takenClasses:
            takenClassesObj.append({"className": row.className, "grade": row.grade})

        profileObj['taken'] = takenClassesObj

    return profileObj


#applicationRow_to_obj
#convert an Application into readable format for JSON
def applicationRow_to_obj(applicationRow):
    applicationRow = {
                    "id": applicationRow.id,
                    "student_id": applicationRow.student_id,
                    "teacher_id": applicationRow.teacher_id,
                    "space": applicationRow.space,
                    "studentName": applicationRow.studentName,
                    "className": applicationRow.className,
                    "classTime": applicationRow.classTime,
                    "classDays": applicationRow.classDays,
                    "created_at": applicationRow.created_at,
                    "lecture_id": applicationRow.lecture_id,
                    "lecture_teacherName": applicationRow.lecture_teacherName,
                    "lecture_isClosed": applicationRow.lecture_isClosed,
                    "appAccepted": applicationRow.appAccepted
                }
    return applicationRow


#applicationRow_to_obj
#convert a Lectire into readable format for JSON
def lectureRow_to_obj(lectureRow):
    lectureObj = {
                    "id": lectureRow.id,
                    "teacher_id": lectureRow.teacher_id,
                    "space": lectureRow.space,
                    "teacherName": lectureRow.teacherName,
                    "className": lectureRow.className,
                    "classTime": lectureRow.classTime,
                    "classDays": lectureRow.classDays,
                    "lectureAccepted": lectureRow.lectureAccepted
                }

    if (current_user.id == lectureRow.teacher_id):
        lectureObj['wantedTAs'] = lectureRow.wantedTAs
        lectureObj['currentTAs'] = lectureRow.currentTAs

    return lectureObj



def main():
    db.create_all() # creates the tables you've provided
    app.run()       # runs the Flask application  

if __name__ == '__main__':
    main()

    

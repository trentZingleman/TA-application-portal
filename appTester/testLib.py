"""
A library for functional testing of the backend API
"""

import unittest
import traceback
#import httplib
import http.client
import sys
import os
import json


class RestTestCase(unittest.TestCase):
    """
    Superclass for functional tests. Defines the boilerplate for the tests
    """

    # Lookup the name of the server to test
    serverToTest = "localhost:3000"
    if "TEST_SERVER" in os.environ:
        serverToTest = os.environ["TEST_SERVER"]
        # Drop the http:// prefix
        splits = serverToTest.split("://")
        if len(splits) == 2:
            serverToTest = splits[1]

    def makeRequest(self, url, method="GET", data={ }):
        """
        Make a request to the server.
        @param url is the relative url (no hostname)
        @param method is either "GET" or "POST"
        @param data is an optional dictionary of data to be send using JSON
        @result is a dictionary of key-value pairs
        """

        printHeaders = (os.getenv("VERBOSE") == '1')
        headers = { }
        body = ""
        if data is not None:
            headers = { "content-type": "application/json", "Accept": "application/json" }
            body = json.dumps(data)

        try:
            self.conn.request(method, url, body, headers)
        except Exception as e:
            if str(e).find("Connection refused") >= 0:
                print ("Cannot connect to the server "+RestTestCase.serverToTest+". You should start the server first, or pass the proper TEST_SERVER environment variable")
                sys.exit(1)
            raise

        self.conn.sock.settimeout(100.0) # Give time to the remote server to start and respond
        resp = self.conn.getresponse()
        data_string = "<unknown"
        try:
            if printHeaders:
                print ("\n****")
                print ("  Request: "+method+" url="+url+" data="+str(data))
                print ("  Request headers: "+str(headers))
                print ("")
                print ("  Response status: "+str(resp.status))
                print ("  Response headers: ")
                for h, hv in resp.getheaders():
                    print ("    "+h+"  =  "+hv)

            self.assertEqual(200, resp.status)
            data_string = resp.read()
            if printHeaders:
                print ("  Response data: "+str(data_string))
            # The response must be a JSON request
            # Note: Python (at least) nicely tacks UTF8 information on this,
            #   we need to tease apart the two pieces.
            self.assertTrue(resp.getheader('content-type') is not None, "content-type header must be present in the response")
            self.assertTrue(resp.getheader('content-type').find('application/json') == 0, "content-type header must be application/json")


            data = json.loads(data_string)
            return data

        except:
            # In case of errors dump the whole response,to simplify debugging
            print ("Got exception when processing response to url="+url+" method="+method+" data="+str(data))
            print ("  Response status = "+str(resp.status))
            print ("  Response headers: ")
            for h, hv in resp.getheaders():
                print ("    "+h+"  =  "+hv)
            print ("  Data string: "+data_string)
            print ("  Exception: "+traceback.format_exc ())
            if not printHeaders:
                print ("  If you want to see the request headers, use VERBOSE=1")
            raise


    def setUp(self):
        #self.conn = httplib.HTTPConnection(RestTestCase.serverToTest, timeout=1)
        self.conn = http.client.HTTPConnection(RestTestCase.serverToTest, timeout=10)

    def tearDown(self):
        self.conn.close ()


## NOW SOME METHODS THAT ARE USEFUL FOR TESTING SMILES



##new stuff
class AppTestCase(RestTestCase):
    
    def setUp(self):
        # Run first the setUp from the superclass
        RestTestCase.setUp(self)
        # As part of the setup, we grab the SPACE from the environment
        assert 'SPACE' in os.environ, "While running these tests you must specify TEST=..."
        self.space = os.environ["SPACE"]
        # We empty the smile space, before we start the test
        self.deleteAllLectures()
    
    
    #helper function that accepts an application with a given id (the application id)
    def acceptApplication(self, id):
        url = '/api/applications/'+str(id)
        self.makeRequest(url, method='POST')

    #//////////////INSERTING FUNCTIONS vvvvvvvvvvvvvvv
    #helper function to create a new lecture
    def createLecture(self, teacherName, className, classTime, classDays):
        newLecture = {'space' : self.space,
                      'teacherName' : teacherName,
                      'className' : className,
                      'classTime' : classTime,
                      'classDays' : classDays
                     }

        url = '/api/lectures'

        respData = self.makeRequest(url, method='POST', data=newLecture)
        return respData

    
    #helper function to create an application that applies to a lecture with a given id (the lecture id)
    def createApplication(self, id, studentName):
        newApplication = {'space' : self.space,
                          'studentName' : studentName
                         }

        url = '/api/lectures/'+str(id)

        respData = self.makeRequest(url, method='POST', data=newApplication)
        return respData

    #//////////////END OF INSERTING FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^

    #//////////GETTING FUNCTIONS vvvvvvvvvvvvvvvvvvvvvvvv
    #helper function to get a list of lectures with given inputs
    def getLectures(self,
                    count=None,
                    teacherName=None,
                    className=None,
                    classDays=None,
                    lectureAccepted=None,
                    order_param=None,
                    order_by=None):

        url = '/api/lectures?space='+self.space
        if count is not None:
            url += '&count='+str(count)
        if teacherName is not None:
            url += '&teacherName='+teacherName
        if className is not None:
            url += '&className='+className
        if classDays is not None:
            url += '&classDays='+classDays
        if lectureAccepted is not None:
            url += '&lectureAccepted='+lectureAccepted
        if order_param is not None:
            url += '&order_param='+order_param
        if order_by is not None:
            url += '&order_by='+order_by

        print(url)

        respData = self.makeRequest(url, method='GET')
        return respData

    #helper function to get a list of applications with given inputs
    def getApplications(self,
                    count=None,
                    studentName=None,
                    className=None,
                    classDays=None,
                    appAccepted=None,
                    order_param=None,
                    order_by=None):

        url = '/api/applications?space='+self.space
        if count is not None:
            url += '&count='+str(count)
        if studentName is not None:
            url += '&studentName='+studentName
        if className is not None:
            url += '&className='+className
        if classDays is not None:
            url += '&classDays='+classDays
        if appAccepted is not None:
            url += '&appAccepted='+appAccepted
        if order_param is not None:
            url += '&order_param='+order_param
        if order_by is not None:
            url += '&order_by='+order_by

        print(url)

        respData = self.makeRequest(url, method='GET')
        return respData

    #helper function to get one lecture with the given id
    def getOneLecture(self, id):
        url = '/api/lectures/'+str(id)

        print(url)

        respData = self.makeRequest(url, method='GET')
        return respData

    #helper function to get one application with the given id
    def getOneApplication(self, id):
        url = '/api/applications/'+str(id)

        print(url)

        respData = self.makeRequest(url, method='GET')
        return respData

    #//////////END OF GETTING FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^

    #///////////// DELETING FUNCTIONS vvvvvvvvvvvvvvvvvvvvvvv
    #helper function to delete all lectures (which includes all applications) in a space
    def deleteAllLectures(self):
        url = '/api/lectures?space='+self.space
        self.makeRequest(url, method='DELETE')


    #helper function to delete one lecture with the given id
    def deleteOneLecture(self, id):
        url = '/api/lectures/'+str(id)
        self.makeRequest(url, method='DELETE')


    #helper function to delete all applications in a space
    def deleteAllApplications(self):
        url = '/api/applications?space='+self.space
        self.makeRequest(url, method='DELETE')


    #helper function to delete one application with the given id
    def deleteOneApplication(self, id):
        url = '/api/applications/'+str(id)
        self.makeRequest(url, method='DELETE')

    #///////////// END OF DELETING FUNCTIONS ^^^^^^^^^^^^^^^^

    #helper function that checks and makes sure that there is no error message
    def assertSuccessResponse(self,
                              respData,
                              msg=None):

        self.assertEqual(1, respData['status'], msg)




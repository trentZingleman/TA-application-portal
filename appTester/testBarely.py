"""
This file contains a small subset of the tests we will run on your backend submission
"""

import unittest
import os
import testLib
#from testLib import *



##new stuff

class TestApp(testLib.AppTestCase):

    ##these are the actual tests
    def test1(self):
        #create a lecture 
        respGetLec = self.createLecture(teacherName="Bobby Smith", className="CPTS322", classTime="12:10pm - 1:00pm", classDays="MWF")
        self.assertSuccessResponse(respGetLec)
        self.assertEqual('Bobby Smith', respGetLec['lectures']['teacherName'])
        self.assertEqual('CPTS322', respGetLec['lectures']['className'])

        #test to see if we can retreive the above lecture with its id
        respGetTest = self.getOneLecture(id=respGetLec['lectures']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Bobby Smith', respGetTest['lectures']['teacherName'])

        #test to see if we can retreive the above lecture by searching for the teacherName
        respGetTest = self.getLectures(teacherName="Bobby_Smith")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Bobby Smith', respGetTest['lectures'][0]['teacherName'])

        #test to see if we can retreive the above lecture by searching for the teacherName and className
        respGetTest = self.getLectures(teacherName="Bobby_Smith", className="CPTS322")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Bobby Smith', respGetTest['lectures'][0]['teacherName'])

        #create an application applying to the above lecture
        respGetApp = self.createApplication(id=respGetLec['lectures']['id'], studentName="James Milker")
        self.assertSuccessResponse(respGetApp)
        self.assertEqual('James Milker', respGetApp['applications']['studentName'])
        self.assertEqual(respGetApp['applications']['className'], respGetLec['lectures']['className'])
        self.assertEqual(respGetApp['applications']['lecture_id'], respGetLec['lectures']['id'])

        #check to see if we can retreive the above application with its id
        respGetTest = self.getOneApplication(id=respGetApp['applications']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('James Milker', respGetTest['applications']['studentName'])

        #check to see if we can retreive the above application by searching for the studentName
        respGetTest = self.getApplications(studentName="James_Milker")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('James Milker', respGetTest['applications'][0]['studentName'])

        #check to see if we can retreive the above application by searching for the studentName and appAccepted
        respGetTest = self.getApplications(studentName="James_Milker", appAccepted="false")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('James Milker', respGetTest['applications'][0]['studentName'])

        #create another application to the above lecture
        respGetApp = self.createApplication(id=respGetLec['lectures']['id'], studentName="Boof Boi")
        self.assertSuccessResponse(respGetApp)
        self.assertEqual('Boof Boi', respGetApp['applications']['studentName'])
        self.assertEqual(respGetApp['applications']['className'], respGetLec['lectures']['className'])
        self.assertEqual(respGetApp['applications']['lecture_id'], respGetLec['lectures']['id'])

        #check to see if we can retreive the above application with its id
        respGetTest = self.getOneApplication(id=respGetApp['applications']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Boof Boi', respGetTest['applications']['studentName'])

        #check to make sure there are two applications applied to the above lecture (I know this is redundant if the last case passed but whatever)
        respGetTest = self.getApplications(classDays="MWF")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual(2, len(respGetTest['applications']))

        #accept the above application to the above lecture and make sure both the lecture and application get the accepted flag
        respGetTest = self.acceptApplication(id=respGetApp['applications']['id'])
        #self.assertSuccessResponse(respGetTest)
        respGetTest = self.getOneApplication(id=respGetApp['applications']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('true', respGetTest['applications']['appAccepted'])
        respGetTest = self.getOneLecture(id=respGetLec['lectures']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('true', respGetTest['lectures']['lectureAccepted'])

        #delete the above application and make sure the lecture reverted back to 'false' with the lectureAccepted variable
        respGetTest = self.deleteOneApplication(id=respGetApp['applications']['id'])
        #self.assertSuccessResponse(respGetTest)
        respGetTest = self.getApplications(classDays="MWF")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual(1, len(respGetTest['applications']))
        respGetTest = self.getOneLecture(id=respGetLec['lectures']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('false', respGetTest['lectures']['lectureAccepted'])

        #create a lecture 
        respGetLec = self.createLecture(teacherName="Jade Rango", className="CPTS302", classTime="1:10pm - 2:00pm", classDays="TuTh")
        self.assertSuccessResponse(respGetLec)
        self.assertEqual('Jade Rango', respGetLec['lectures']['teacherName'])
        self.assertEqual('CPTS302', respGetLec['lectures']['className'])

        #apply to above lecture
        respGetApp = self.createApplication(id=respGetLec['lectures']['id'], studentName="Phil")
        self.assertSuccessResponse(respGetApp)
        self.assertEqual('Phil', respGetApp['applications']['studentName'])
        respGetTest = self.getApplications(studentName="Phil", appAccepted="false")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Phil', respGetTest['applications'][0]['studentName'])

        #create a lecture 
        respGetLec = self.createLecture(teacherName="Dollar Sign", className="CPTS360", classTime="1:10pm - 2:00pm", classDays="MWF")
        self.assertSuccessResponse(respGetLec)
        self.assertEqual('Dollar Sign', respGetLec['lectures']['teacherName'])
        self.assertEqual('CPTS360', respGetLec['lectures']['className'])

        #apply to above lecture
        respGetApp = self.createApplication(id=respGetLec['lectures']['id'], studentName="Some Guy")
        self.assertSuccessResponse(respGetApp)
        self.assertEqual('Some Guy', respGetApp['applications']['studentName'])
        respGetTest = self.getApplications(studentName="Some_Guy", appAccepted="false")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Some Guy', respGetTest['applications'][0]['studentName'])

        respGetTest = self.acceptApplication(id=respGetApp['applications']['id'])
        #self.assertSuccessResponse(respGetTest)
        respGetTest = self.getOneApplication(id=respGetApp['applications']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('true', respGetTest['applications']['appAccepted'])
        respGetTest = self.getOneLecture(id=respGetLec['lectures']['id'])
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('true', respGetTest['lectures']['lectureAccepted'])

        #create a lecture 
        respGetLec = self.createLecture(teacherName="Ricky Bobby", className="CPTS223", classTime="2:10pm - 3:00pm", classDays="MWF")
        self.assertSuccessResponse(respGetLec)
        self.assertEqual('Ricky Bobby', respGetLec['lectures']['teacherName'])
        self.assertEqual('CPTS223', respGetLec['lectures']['className'])

        #apply to above lecture
        respGetApp = self.createApplication(id=respGetLec['lectures']['id'], studentName="Albert Hoonstein")
        self.assertSuccessResponse(respGetApp)
        self.assertEqual('Albert Hoonstein', respGetApp['applications']['studentName'])
        respGetTest = self.getApplications(studentName="Albert_Hoonstein", appAccepted="false")
        self.assertSuccessResponse(respGetTest)
        self.assertEqual('Albert Hoonstein', respGetTest['applications'][0]['studentName'])
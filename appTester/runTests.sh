#!/bin/bash -eu 
# 
function help {
    echo "Helper script for running the automated tests"
    echo "Invoke as follows: "
    echo "   [VERBOSE=1]  TEST_SERVER=127.0.0.1:8000 SPACE=my_test_space ./runTests.sh [test_spec]"
    echo ""
    echo "  VERBOSE=1 is optional and will print the messages sent/received"
    echo "  TEST_SERVER is mandatory; must be the url of the server you are testing"
    echo "  SPACE is mandatory; must be a space that you want to use for testing."
    echo "              Keep in mind that everything in that space will be deleted"
    echo "              while running the test"
    echo " "
    echo "  test_spec : optionally specify one or more tests, named as testing.testBarely.TestApp.testAdd1"
}

#   
thisdir=`dirname $0`
thisdir=`cd $thisdir && pwd`

# Check that TEST_SERVER is specified
if test -z ${TEST_SERVER:-} ;then
    echo "ERROR: You must specify TEST_SERVER"
    help
    exit 1
fi

# Check that SPACE is specified
if test -z ${SPACE:-} ;then
    echo "ERROR: You must specify the SPACE"
    help
    exit 1
fi

# We have to be in the parent directory
#cd $thisdir/..
#cd $thisdir

# See if we specify which tests to run
TESTS=$*
if test -z ${TESTS:-} ;then 
    python -m unittest discover -v 
else
    python -m unittest -v ${TESTS}
fi



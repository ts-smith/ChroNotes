
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

function errorHandler(e) {
    var msg = '';
    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR: msg = 'QUOTA_EXCEEDED_ERR'; break;
        case FileError.NOT_FOUND_ERR: msg = 'NOT_FOUND_ERR'; break;
        case FileError.SECURITY_ERR: msg = 'SECURITY_ERR'; break;
        case FileError.INVALID_MODIFICATION_ERR: msg = 'INVALID_MODIFICATION_ERR'; break;
        case FileError.INVALID_STATE_ERR: msg = 'INVALID_STATE_ERR'; break;
        default: msg = 'Unknown Error'; break;
    };
    document.querySelector('#example-list-fs-ul').innerHTML = 'Error: ' + msg;
}


function ListCtrl($scope, intermediary) {
    $scope.recordings = {};

    $scope.$on('shareJson', function() {
        var annotations = intermediary.jsonAnnotations.annotationList;
        var filename = intermediary.jsonAnnotations.recordingName;

        fs.root.getFile(filename, {create: true}, function (fileEntry){
            fileEntry.remove(function (){
                $scope.writeFile(filename, JSON.stringify(annotations));
            });
        })



    });

    $scope.deleteFile = function (fileEntry){
        fileEntry.remove($scope.readEntries);
    }

    //required due to asynch
    $scope.init = function () {

        //fs.root.getFile("fileBuffer.wav", {create: true}, null, errorHandler);

        $scope.writeFile = function (file, data, append){

            fs.root.getFile(file, {create: !append }, function(fileEntry) {

                // Create a FileWriter object for our FileEntry (file).
                fileEntry.createWriter(function(fileWriter) {

                    if (append) {
                        fileWriter.seek(fileWriter.length);
                    }

                    fileWriter.onwriteend = function(e) {console.log('Write completed.');};
                    fileWriter.onerror    = function(e) {console.log('Write failed: ' + e.toString());};

                    var blob = new Blob([data]);  /* , {type: 'text/plain'}   */

                    fileWriter.write(blob);

                }, errorHandler);
            }, errorHandler);
        }

        $scope.appendFile = function (file, data){
            $scope.writeFile(file,data,true);
        }

        $scope.readFile = function (fileName) {
            fs.root.getFile(fileName, {}, function(fileEntry) {

                // Get a File object representing the file,
                // then use FileReader to read its contents.
                fileEntry.file(function(file) {
                    var reader = new FileReader();

                    reader.onloadend = function(e) {
                        $scope.text = this.result;
                    };

                    reader.readAsText(file);

                }, errorHandler);

            }, errorHandler);
        }

        $scope.dirReader = fs.root.createReader();
        $scope.readEntries();


    }//end init

    $scope.readEntries = function () {
        var loop =  function (){
            $scope.dirReader.readEntries(function (entries) {
                if (!entries.length){
                    //I don't like this here
                    $scope.$apply();
                    return;
                }
                //call back requires this function to use apply
                for (var i = 0 ; i < entries.length; i++){

                    //all this may be unnecessary. Might not need json to be associated here
                    var entry = entries[i];
                    var extSplit = entry.name.lastIndexOf(".");
                    var fileRoot = entry.name.substring(0,extSplit);
                    var ext = entry.name.substring(extSplit + 1);

                    var recording = newRecordings[fileRoot];

                    if (!recording){
                        newRecordings[fileRoot] = {};
                    }
                    if (ext === "wav"){
                        newRecordings[fileRoot].wav = entry;
                    }
                    else if (ext === "json"){
                        newRecordings[fileRoot].json = entry;
                    }
                    else {
                        //should use more proper error here
                        alert("What did you do?");
                    }
                }

                loop();

            }, errorHandler);



        }
        //callback madness
        var update = function (){
            newRecordings = {};
            loop();
            $scope.recordings = newRecordings;
            glob = $scope.recordings;
        }
        refreshFSAnd(update);
    }
}
var requestedQuota = 1024 * 1024 * 1024 * 20;
var grantedBytesGlobal = requestedQuota;
navigator.webkitPersistentStorage.requestQuota(requestedQuota)

window.requestFileSystem(PERSISTENT, requestedQuota, function (filesystem) {
    fs = filesystem;

    var callback = function () {
        var scope = angular.element("#fileList").scope();

        scope.init();
    }
    setTimeout(callback, 500);

}, errorHandler);

var refreshFSAnd = function (callback) {
    window.requestFileSystem(PERSISTENT, requestedQuota, function (filesystem) {
        fs = filesystem;
        var scope = angular.element("#fileList").scope();
        scope.fs = fs;
        scope.dirReader = fs.root.createReader();
        callback();
    }, errorHandler)
}


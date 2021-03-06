realityIndex.directive('loadmetadata', function(){
    //all this should be called after ng-src updates the src, which
    //happens after the filemanager returns the recording info in $on('recordingInfoResponse')
    return function(scope, element, attrs){
        element.bind('loadedmetadata', function(){
            //only do this if ng-src has triggered
            if(attrs.src){
                scope.audio = document.getElementById('playbackAudio');
                scope.duration = scope.audio.duration;
                scope.$apply(scope.layoutAnnotations());
            }
        })
    }
})

function PlaybackCtrl ($scope, $routeParams, intermediary, $window, $location){
    $scope.editAnnotation = function(annotation){
        var old = annotation.note;
        //Edit Key Dispatch
        return function(event){
            //Escape
            if (event.which == 27){
                annotation.note = old;
                annotation.editable = "false";
                $scope.$apply();
            }
            //Enter
            else if (event.which === 13) {
                annotation.note = parseContentFromHtml(annotation.note);

                old = annotation.note;
                annotation.editable = "false";
                $scope.$apply();
            }
        }
    }


    //should handle case when recording is not found
    $scope.recordingName = $routeParams.recordingName;

    $scope.recordingAnnotations = '';
    var timeline = document.getElementById('playbackTimeline');
    $scope.clientWidth =  timeline.clientWidth;
    $scope.baseTop = getBaseTop(timeline.children[0]);

    //wait for file system to be initialized before requesting annotations
    //*hacky
    if (intermediary.initialized){
        intermediary.requestRecordingInfo($scope.recordingName);
    }
    else{
        $scope.$on('filesystemInitialized', function () {
            intermediary.requestRecordingInfo($scope.recordingName);
        })
    }
    //*/

    $scope.$on('recordingInfoResponse', function () {
        //this all could be simplified using timeout recursively
        $scope.$apply($scope.layoutPlayback);
    });

    $scope.layoutPlayback = function () {
        //this triggers the event that calls the final layout code, layoutAnnotations();
        $scope.fileURL = intermediary.fileURL;
        $scope.recordingAnnotations = intermediary.annotationResponse;
    };


    $scope.layoutAnnotations = function () {
        var levels = [-100,80,-40,120,-80,40];
        var annotationLevels = [[],[],[],[],[],[]];
        var currentLevel = 0;

        var AddLayoutData = function(levelIndex){
            var timeProportion = this.offset / $scope.audio.duration;
            this.position = timeProportion * $scope.clientWidth;
            this.level = levels[levelIndex];

            //this object needs a new name
            this.editable = "false";
        }
        for (var i = 0; i < $scope.recordingAnnotations.length; i++){
            //why
            AddLayoutData.apply($scope.recordingAnnotations[i], [currentLevel]);

            annotationLevels[currentLevel].push($scope.recordingAnnotations[i]);

            if (++currentLevel == levels.length){
                currentLevel = 0;
            }
        }

        var minSpace = 3;
        var padding = 7;
        for (var i = 0; i < annotationLevels.length; i++){
            var level = annotationLevels[i];


            for (var k = 0; k < level.length - 1; k++){
                var thisOne = level[k];
                var nextOne = level[k+1];

                var distance = nextOne.position - thisOne.position;
                var maxWidth = distance - padding;
                thisOne.maxWidth = maxWidth > minSpace ? maxWidth : minSpace;
            }

            if(level.length){
                level[level.length - 1].maxWidth = 100;
            }
        }
    }


    $scope.playAnnotation = function(annotation) {
        $scope.audio.controls = true;
        var time = annotation.offset;

        $scope.audio.currentTime = time;
        $scope.audio.play();
    }
    $scope.pauseAudio = function () {
        $scope.audio.pause();
    }





    function getY(ele){
        var y=0;
        while(true){
            y += ele.offsetTop;
            if(ele.offsetParent === null){
                break;
            }
            ele = ele.offsetParent;
        }
        return y;
    }
    function getBaseTop(timeline){
        return getY(timeline) - 19;
    }
    $window.onresize = function (e) {
        var timeline = document.getElementById('playbackTimeline');

        $scope.clientWidth =  timeline.clientWidth;

        var y = getBaseTop(timeline.children[0]);
        $scope.$apply($scope.baseTop = y);
    }

    $scope.createTagContext = function (annotation, index, event){
        if (annotation.editable == "false"){


            var functionList = [];

            functionList.push({text: "Play",
                f: function (){
                    $scope.playAnnotation(annotation);
            }});

            functionList.push({text: "Edit",
                f: function(){
                    annotation.editable = "true";
                    setTimeout(function() {event.target.focus()}, 0);
            }});

            functionList.push({text: "Delete",
                f: function(){
                    $scope.recordingAnnotations.splice(index, 1);
            }});

            functionList.push({text: "Move",
                f: function(){
                    alert("need to get the index, and then attach the position of the specific annotation to the mouse." +
                        "\n Also need to some how make the old position change appearance, and should create a new" +
                        "object that shows where the thing will be dropped")
            }});

            $scope.createRadialMenu(functionList, event);
        }
    }
}
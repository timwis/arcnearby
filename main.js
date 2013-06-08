var arcnearby = require("./arcnearby")
    ,_ = require("underscore");
(function(arcnearby) {
    
    var coords = [39.9365,-75.1661]
        ,boundingBox = arcnearby.getBoundingBox(coords, 1.0);
    arcnearby.query("cornerStores", boundingBox, function(response, body) {
        var data = JSON.parse(body);
        console.log("Found " + data.features.length + " results");
        var sorted = arcnearby.sortByDistance(data.features, coords);
        _.each(sorted, function(result) {
            console.log(result.attributes);
        });
    }, function(resopnse) {
        console.log("Error");
    });
    
})(arcnearby);
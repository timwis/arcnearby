var module = module || {}
    ,_ = require("underscore")
    ,request = require("request");

(function(app, _, request) {

    app.options = {
        apiHost: "http://gis.phila.gov"
        ,apiPath: "/arcgis/rest/services"
        ,services: {
            farmersMarkets: "/PhilaGov/Farmers_Markets/MapServer/0/query"
            ,cornerStores: "/PhilaGov/Healthy_Corner_Stores/MapServer/0/query"
        }
        ,params: {
            where: "1=1"
            ,outFields: "*"
            ,geometry: ""
            ,geometryType: "esriGeometryEnvelope"
            ,spatialRel: "esriSpatialRelContains"
            ,inSR: "4326"
            ,outSR: "4326"
            ,returnGeometryOnly: "True"
            ,returnIdsOnly: "False"
            ,f: "pjson"
        }
    };
    
    /**
     * Gets distance in miles between two latitude/longitude coordinates
     * No idea how this sorcery works
     * @param {Array} start Lat/lng coordinate 1
     * @param {Array} end Lat/lng coordinate 2
     * @returns {Number} Distance in miles
     */
    app.getCoordDistance = function(start, end) {
        var deg2rad = function(deg) { return deg * (Math.PI / 180); }
            ,radius = 3963 // radius of the earth in miles
            ,d = [deg2rad(end[0] - start[0]), deg2rad(end[1] - start[1])]
            ,a = Math.sin(d[0] / 2) * Math.sin(d[0] / 2) + // No idea wtf is going on these 3 lines
                    Math.cos(deg2rad(start[0])) * Math.cos(deg2rad(end[0])) *
                    Math.sin(d[1] / 2) * Math.sin(d[1] / 2)
            ,c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            ,distance = radius * c;
            return distance;
    };
    
    /**
     * Generates bounding box (square) around a center point with a given radius
     * @param {Array} coords Latitude/Longitude of the center point
     * @param {Number} radius Radius of the box in miles
     * @returns {Array} Bounding box in xmin,ymin,xmax,ymax order ready for an ArcGIS REST query
     */
    app.getBoundingBox = function(coords, radius) {
        var mile = [0.0192, 0.01499] // 1 square mile in degrees (lat, lng)
            ,boundingBox = [
                coords[1] - (mile[0] * radius) // xmin/left
                ,coords[0] - (mile[1] * radius) // ymin/bottom
                ,coords[1] + (mile[0] * radius) // xmax/right
                ,coords[0] + (mile[1] * radius) // ymax/top
            ];
        console.log(boundingBox);
        return boundingBox;
    };
    
    /**
     * Calculates distance from a center point for an array of ArcGIS results, then returns an array of the results sorted by distance
     * @param {Array} features The "features" object from an ArcGIS REST API result
     * @param {Array} coords Lat/lng center point to calculate distance from
     * @returns {Array} Returns features array sorted by new attribute, distance
     */
    app.sortByDistance = function(features, coords) {
        var results = [];
        _.each(features, function(feature) {
            feature.attributes.distance = app.getCoordDistance(coords, [feature.geometry.y, feature.geometry.x]);
            results.push(feature);
        });
        results.sort(function(a, b) {
            return a.attributes.distance - b.attributes.distance;
        });
        return results;
    };
    
    /**
     * Basic serialize helper function, converts object to querystring
     * @param {Object} obj Object of params
     * @returns {String} Querystring of params
     */
    app.serialize = function(obj) {
        var str = [];
        for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        return str.join("&");
    };
    
    /**
     * Main wrapper for library
     * Generates bounding box, executes HTTP request to ArcGIS REST API, sorts by distance
     * @param {String} service Which ArcGIS service to query
     * @param {Array} boundingBox The xmin,ymin,xmax,ymax bounding box to look for features within
     * @param {Function} successCallback
     * @param {Function} errorCallback
     */
    app.getNearby = function(service, coords, radius, successCallback, errorCallback) {
        var url = url = app.options.apiHost + app.options.apiPath + (app.options.services[service] || "")
            ,params = _.clone(app.options.params);
        params.geometry = app.getBoundingBox(coords, radius); // Get bounding box
        url += "?" + app.serialize(params);
        console.log(url);
        request(url, function(error, response, body) { // Query REST service
            if(error) {
                errorCallback(response, body);
            } else {
                var data = JSON.parse(body);
                successCallback((data.features !== undefined) ? app.sortByDistance(data.features, coords) : {}); // Sort by distance
            }
        });
    };

})(module.exports, _, request);
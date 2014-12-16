var pip = require('geojson-utils');

// create an object for options
var options = {
 elt: document.getElementById('map'),           // ID of map element on page
 zoom: 10,                                      // initial zoom level of the map
 latLng: { lat: 38.743943, lng: -77.020089 },  // center of map in latitude/longitude
 mtype: 'map',                                  // map type (map, sat, hyb); defaults to map
 bestFitMargin: 0,                              // margin offset from map viewport when applying a bestfit on shapes
 zoomOnDoubleClick: true                        // enable map to be zoomed in when double-clicking on map
};

// construct an instance of MQA.TileMap with the options object
window.map = new MQA.TileMap(options);

var map = window.map;


MQA.withModule('largezoom', 'mousewheel', function() {
	
	// add the Large Zoom control
	/*map.addControl(
	  new MQA.LargeZoom(),
	  new MQA.MapCornerPlacement(MQA.MapCorner.TOP_LEFT, new MQA.Size(5,5))
	);*/
	
	// enable zooming with your mouse
	map.enableMouseWheelZoom();

});


$.ajax({
    url: path + 'Programs.json',
	 dataType: 'json',
    success: function(programs) {
        $.ajax({
				url: path + 'Rectangles.json',
				dataType: 'json',
				success: function(dat) {
                $('#fm').on('submit', function(e) {
							if($('#address').val() == "")
								return alert("Oops! You didn't enter any text. Click OK and try again.");
                    e.preventDefault();
                    e.stopPropagation();
							$.ajax('http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluur296an9%2Cb0%3Do5-90r514&location=' +
							encodeURIComponent($('#address').val())).done(function(res) {
									if (res.results && res.results[0] && res.results[0].locations && res.results[0].locations[0] && res.results[0].locations[0].geocodeQuality != "COUNTRY") {
                              var areas = findLocation(dat, res.results[0].locations[0]);
                              if (areas.length)
											loadResults(res.results[0].locations[0], areas, programs);
									  else {
											alert("Sorry, we couldn't find a match for \"" + $('#address').val() + "\". Please try again.");
									  }
                          }
								  else {
										alert("Sorry, we couldn't find a match for \"" + $('#address').val() + "\". Please try again.");
								  }
                      });
                    return false;
                });
					
					 var qs = win.location.search.substr(1); //exclude "?"
					 var address = "";
					 if(qs != null && qs != "") {
						var queries =  qs.split("&");
						for (var query in queries) {
							var qsplit = queries[query].split("=");
							if(qsplit[0] == "address" && qsplit[1] != ""){
								$('#address').val(decodeURIComponent(qsplit[1]).split('+').join(' '));
								$('#fm').trigger('submit');
							}
						}
					 }
            },
				error: function(jqxhr, status, error) {
						alert("Status: " + status + ". Error: " + error);
				}
        });
    },
	 error: function(jqxhr, status, error) {
			alert("Status: " + status + ". Error: " + error);
	 }
});

function findLocation(index, ll) {

    var results = [];

    for (var i = 0; i < index.length; i++) {


     if (ll.displayLatLng.lat > index[i][0] &&
            ll.displayLatLng.lat < index[i][1] &&

            ll.displayLatLng.lng > index[i][2] &&
            ll.displayLatLng.lng < index[i][3]) {

		  
            results.push(index[i]);
        }

    }

    return results;
}

function loadResult(r, cb) {
	$.ajaxSetup({ cache: false });
	$.getJSON('geojson/' + r[4] + '.geojson').done(
		function(d) {
        cb(null, d);
		}
	);
}

var q = queue(1);

function loadResults(center, results, programs) {

    results.forEach(function(r) {
        q.defer(loadResult, r);
    });

    q.awaitAll(function(err, results) {

        var res = results.filter(
				function(r) {
					var inPolygon = false;
					for (var i = 0; i < r.features.length; i++) {
						inPolygon = inPolygon || gju.pointInPolygon(
							 {type: 'Point',
							 coordinates: [center.displayLatLng.lng, center.displayLatLng.lat]}
							, r.features[i].geometry
						);
					}
					return inPolygon;
        })[0];

        if (!res) return alert('No location found');

        //fl.clearLayers(); clear geojson layers
        //fl.addData(res); add result (matched geojson polygons) to map)
        //fl.addData({ type: 'Point', coordinates: [center.displayLatLng.lng, center.displayLatLng.lat] }); add point corresponding to location from user query

 
			var userLoc = { lat: center.displayLatLng.lat, lng: center.displayLatLng.lng };
		  map.setCenter(userLoc);
		  var userPin = new MQA.Poi({ lat: center.displayLatLng.lat, lng: center.displayLatLng.lng });
		  map.addShape(userPin);
			 MQA.withModule('shapes', function() {
				 
				// create an instance of MQA.PolygonOverlay
				var poly = new MQA.PolygonOverlay();
			 
				// set the shape points
				poly.setShapePoints(res.features[0].geometry.coordinates[0]);
			 
				// add the overlay to the map's default shape collection
				map.addShape(poly);
			 
			 });
        //map.fitBounds(fl.getBounds()); set map bounds

			var sa = res.features[0].properties["SA"]
        var $info = $('#info').html("");
            //.html(res.properties.Description);
        //var rno = $($('#info td')[1]).text().trim();

        for (var i = 0; i < programs.length; i++) {

            if (programs[i].Serv_Area_ID == sa) {
					var aShortUrl = programs[i]["Web_URL"];
					var aSlashes = aShortUrl.indexOf("//");
					if (aSlashes > 0) aShortUrl = aShortUrl.substring(aSlashes + 2);
					if (aShortUrl.charAt(aShortUrl.length - 1) == "/")
						aShortUrl = aShortUrl.substring(0, aShortUrl.length - 1);
					var aPhone = programs[i]["Local_800"];
					if(aPhone == "") aPhone = programs[i]["Phone"];
					aPhone = aPhone.replace("(", "");
					aPhone = aPhone.replace(") ", "-");
					aPhone = aPhone.replace(")", "-");
					 var $tr = $('<tr></tr>').appendTo($info)
					 $('<td><strong><a href="' +  programs[i]["Web_URL"] + '" target="_blank">' + programs[i]["R_Legalname"] + '</a></strong></td>').appendTo($tr);
					 var $tr = $('<tr></tr>').appendTo($info)
					 $('<td>For legal help, call <strong>' + aPhone + ' </strong></td>').appendTo($tr);
					 var $tr = $('<tr></tr>').appendTo($info)
					 $('<td>Website: ' + '<a href="' +  programs[i]["Web_URL"] + '" target="_blank">' + aShortUrl + '</a></td>').appendTo($tr);
            }
        }
    });
}

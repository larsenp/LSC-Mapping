var pip = require('geojson-utils');

(function() {
	//mapQuery is our controller and handles all input listeners, initialization of APIs, initial data fetching, and hand-offs to the existing global query functions
	var mapQuery = ({
		//Identify key DOM elements
		view: {
			map: document.getElementById('map'),
			search: document.getElementById('address'),
			form: document.getElementById('fm'),
			submit: undefined
		},
		//Set up initial blank data model
		model: {
			requests: 0,
			sources: ["Programs","Rectangles"],
			dataReady:false,
			Programs: undefined,
			Rectangles: undefined
		},
		map: undefined,
		autocomplete: undefined,
		activePlace: undefined,
		//Break down URL query string and look for pre-populated address; perform search if present
		queryOnURL: function() {
			var qs = win.location.search.substr(1); //exclude "?"
			if(qs != null && qs != "") {
				var queries =  qs.split("&");
				for (var query in queries) {
					var qsplit = queries[query].split("=");
					if(qsplit[0] == "address" && qsplit[1] != ""){
						this.view.search.value = decodeURIComponent(qsplit[1]).split('+').join(' ');
						var that = this;
						//Search suggestions are returned asynchronously, so have to wait for the result elements to be added to the page
						$("body").on("DOMNodeInserted",function(e) {
							if(e.target.className==='pac-item'){
								$("body").off("DOMNodeInserted");
								that.triggerSearch();
							}
						})
					}
				}
			}
		},
		//Utility function that programmatically initiates a search on string present in the input field
		triggerSearch: function() {
			//Have to run a bit of a hacky series of event triggers here to mimic user input because Google doesn't provide a good handler to trigger an Autocomplete search
			google.maps.event.trigger( this.view.search, 'keydown', {keyCode:40});
	    	google.maps.event.trigger( this.view.search, 'keydown', {keyCode:13});
	    	google.maps.event.trigger( this.view.search, 'focus');
	    	google.maps.event.trigger( this.view.search, 'keydown', {keyCode:13});
	    	google.maps.event.trigger( this.view.search, 'blur');
		},
		//Utility function to alert user of failed search
		searchFail: function() {
			alert("Sorry, we couldn't find a match for \""+this.view.search.value+"\". Please try again.");
		},
		//Add event listeners to DOM elements and mapQuery object
		setHandlers: function() {
			var that = this;
			//Prevent form submit
			$(this.view.form).on("submit",function(e) {
				e.preventDefault();
			})
			//Trigger a search when the submit button is clicked
			//Listen to mousedown/mouseup rather than click here to avoid form element cross-behaviors that trigger the search twice
			$(this.view.submit).on("mousedown",function(e) {
				$(this).one("mouseup",function(e) {
					that.triggerSearch();
				})
			})
			//Trigger a search when Enter is pressed
			$(this.view.search).on("keydown",function(e) {
				if (e.which == 13 || e.keyCode == 13) {
					that.triggerSearch();
				}
			})
			$(this).on({
				//Pass place_changed event from autocomplete field to mapQuery
				"place_changed":function(e,data) {
					//Verify reference data files have been loaded successfully
					if (this.model.dataReady) {
						//Store current place as activePlace for later reference
						this.activePlace = data.place;
						//Add pin to map in correct location, center and zoom map
						var loc = data.place.geometry.location;
						var marker = new google.maps.Marker({
							map: this.map,
							position: loc
						});
						this.map.setCenter(loc);
						this.map.setZoom(10);
						//Convert to location format required by Programs/Rectangles reference
						loc = {displayLatLng:{lat:loc.lat(),lng:loc.lng()}};
						//Pass location to findLocation/loadResults routines
						var areas = findLocation(this.model.Rectangles, loc);
						if (areas.length)
							loadResults(loc, areas, this.model.Programs);
						else {
							this.searchFail();
						}
					} else {
						setTimeout((function() {
							$(this).trigger("place_changed");
						}).bind(this),100);
					}
				}
			})
		},
		getData: function() {
			//Loop over sources and load reference files
			for (var i=0,len=this.model.sources.length;i<len;i++) {
				var source = this.model.sources[i];
				//Increment requests counter
				this.model.requests++;
				(function(source) {
					//If data loads successfully:
					$.getJSON(path + source + ".json").success((function(data) {
						//Store data
					    this.model[source] = data;
					    //Deincrement requests counter
						this.model.requests--;
						//If requests counter == 0, set dataReady flag to true
					    if (!this.model.requests) {
				    		this.model.dataReady = true;
				    	}
					}).bind(this)).error(function(jqxhr, status, error) {
						alert("Status: " + status + ". Error: " + error);
					})
				}).apply(this,[source]);
			}
		},
		//Initialize APIs, data, and listeners
		init: function() {
			//Identify submit - we don't do this above because we want to target our query to the form element, which has to be identified first
			this.view.submit = $(this.view.form).find("input[type=submit]");
			//Generate map
			this.map = new google.maps.Map(this.view.map, {
				center: new google.maps.LatLng(37.09024, -95.712891),
				zoom: 4
			})
			//Generate autocomplete field
			this.autocomplete = new google.maps.places.Autocomplete(this.view.search,{ 
				types: ['geocode'],
				location: new google.maps.LatLng(42.877742,-97.380979),
				radius:2150
			})
			this.setHandlers();
			this.getData();
			var that = this;
			//Listen for place_changed event on autocomplete field, identify place, and pass up to controller
			google.maps.event.addListener(this.autocomplete, 'place_changed', function() {
				var place = that.autocomplete.getPlace();
				if (!place) {
					this.searchFail();
				} else if (place.geometry) {
					$(that).trigger("place_changed",{place:place});
				}
			})
			//Check for URL query string address and run search
			this.queryOnURL();
			return this;
		}
	}).init();
})()

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

 		//Now handled by mapQuery object place_changed listener
		/*	var userLoc = { lat: center.displayLatLng.lat, lng: center.displayLatLng.lng };
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
			 
			 });*/
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

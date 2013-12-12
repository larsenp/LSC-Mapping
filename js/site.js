var pip = require('geojson-utils');
var map = L.mapbox.map('map', 'tmcw.map-oitj0si5')
    .setView([40, -74.50], 9);

var fl = L.geoJson().addTo(map);


$.ajax({
    url: 'master.json',
    success: function(master) {
        $.ajax({
            url: 'rectangles.json',
			dataType: 'json',
            success: function(rectangles) {
                $('#fm').on('submit', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
					//Send user's location information to Mapbox
                    $.ajax('http://api.tiles.mapbox.com/v3/tmcw.map-jcq5zhdm/geocode/' +
                      encodeURIComponent($('#address').val()) + '.json').done(function(res) {
                          if (res.results && res.results[0] && res.results[0][0]) {
								//If Mapbox returns a location, find the rectangles in which the location lies
                              var rect_hits = findLocation(rectangles, res.results[0][0]);
							  //If there is at least one rectangle, do a point-in-polygon search in the corresponding service area(s)
                              if (rect_hits.length) loadResults(res.results[0][0], rect_hits, master);
                          }
                      });
                    return false;
                });
            }
        });
    }
});

function findLocation(rectangles, ll) {

    var results = [];

    for (var i = 0; i < rectangles.length; i++) {

        if (ll.lon > rectangles[i][0] &&
            ll.lon < rectangles[i][2] &&

            ll.lat > rectangles[i][1] &&
            ll.lat < rectangles[i][3]) {

            results.push(rectangles[i]);

        }

    }

    return results;
}

function loadResult(r, cb) {
    $.getJSON('areas/' + r[4] + '.geojson').done(function(d) {
        cb(null, d);
    });
}

var q = queue(1);

function loadResults(center, rectangles, list) {

    rectangles.forEach(function(r) {
        q.defer(loadResult, r);
    });

    q.awaitAll(function(err, rectangles) {

        var res = rectangles.filter(function(r) {
            return gju.pointInPolygon({
                type: 'Point',
                coordinates: [center.lon, center.lat]
            }, r.geometry);
        })[0];

        if (!res) return alert('No location found');

        fl.clearLayers();
        fl.addData(res);
        fl.addData({ type: 'Point', coordinates: [center.lon, center.lat] });
        map.fitBounds(fl.getBounds());

        var $info = $('#info')
            .html(res.properties.Description);
        var rno = $($('#info td')[1]).text().trim();

        for (var i = 0; i < list.length; i++) {

            if (list[i].Org_ID == rno) {
                for (var k in list[i]) {
                    $('<strong></strong>')
                        .text(k + ': ')
                        .appendTo($info);
                    $('<span></span>')
                        .text(list[i][k])
                        .appendTo($info);
                    $('<br />')
                        .appendTo($info);
                }
            }
        }
    });
}

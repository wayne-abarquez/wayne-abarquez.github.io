$(function(){
	var map,
	    storeMarkers = [], storePlacesMarkers = [],
	    userLocation = null,
	    directionDisplay, directionService,
	    geocoder,
	    placesService,
	    distanceService,
	    autocomplete;


    function reverseGeocode(latLng) {
       if(!geocoder) return;
       
       var dfd = $.Deferred();

       geocoder.geocode({'latLng': latLng}, function(results, status) {
         if (status == google.maps.GeocoderStatus.OK) {
	        //return formatted address 
	        // return results[0].formatted_address);
		 	dfd.resolve(results);

	     } else {
	        alert("Geocoder failed due to: " + status);
	     }		 
      });

       return dfd.promise();
    }

	function loadStores() {
		$.each( window.storeData, function( index, item) {

			var storeLatLng = new google.maps.LatLng(item.location.lat, item.location.lng)	
		    var store = new google.maps.Marker({
		    	position: storeLatLng,
		    	title: item.name,
		    	map: map,
		    	icon: "img/store.png"
		   });

		    store.name    = item.name; 
		    storeMarkers[index] = store;


			google.maps.event.addListener(storeMarkers[index], 'click', function() {
				var address = "";
				// Reverse Geocode Latlng to Address 
				$.when(reverseGeocode(storeLatLng)).then(function(results) {
					address = results[0].formatted_address;

					var infoContent =  "<div class='storeInfowindow'>";
				   		infoContent += "Store: <b>"+item.name+"</b> <br/>";
				        infoContent += "Address: <b>"+address+"</b> <br/>";
				        infoContent += "<div class='infowindow-controls'>";
				        infoContent += "<a data-store-index='"+index+"' class='waves-effect waves-light btn getStoreDirection'>Get Directions</a>";
				        infoContent += "</div>";
				        infoContent += "</div>";

					var infowindow = new google.maps.InfoWindow({
			 			content: infoContent
					});

		   			infowindow.open(map, storeMarkers[index]);  
				});
	   		});
	    });
	}	

	function recomputeMapSize() {
		$('#map-canvas').height($(window).height() - (65));
	}

  
	function initialize() {

	  	var mapOptions = {
	  	  zoom: 10,
	  	  center: new google.maps.LatLng(10.3163802, 123.91420629999993),
	  	  mapTypeId: google.maps.MapTypeId.ROADMAP,
	  	  styles: window.mapStyles
	  	};

  			
	  	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	  	recomputeMapSize();
	  	
	  	// Load Stores
		loadStores();

	    //create directionsService object here
	    directionsService = new google.maps.DirectionsService();

	    //setup directionsDisplay object here    
	    directionsDisplay = new google.maps.DirectionsRenderer();
	    directionsDisplay.setMap(map);
	    directionsDisplay.setPanel(document.getElementById('directions-panel')); 

	    // initialize geocoder
	    geocoder = new google.maps.Geocoder();

	    // initialize places service
	    placesService = new google.maps.places.PlacesService(map);

	    // initialize Distance Matrix
  		distanceService = new google.maps.DistanceMatrixService();

  		var searchInput = document.getElementById('search-input');

  		// initialize autocomplete
  		autocomplete = new google.maps.places.Autocomplete(searchInput);
		autocomplete.bindTo('bounds', map);
		

		autocomplete.addListener('place_changed', function() { 
			var place = autocomplete.getPlace();

			if (!place.geometry) {
		      window.alert("Autocomplete's returned place contains no geometry");
		      return;
		    }

		    showStoresFromPlacesAPI(place.geometry.location);
		    // If the place has a geometry, then present it on a map.
		    if (place.geometry.viewport) {
		      map.fitBounds(place.geometry.viewport);
		    } else {
		      map.setCenter(place.geometry.location);
		      map.setZoom(15);
		    }
		});


		// handle window resize event
	    google.maps.event.addDomListener(window, "resize", function() {
	        
	        recomputeMapSize();

	        var center = map.getCenter();
	        google.maps.event.trigger(map, "resize");
	        map.setCenter(center); 
	    });

	} // end of initialize function

	google.maps.event.addDomListener(window, 'load', initialize);


	function getCurrentLocation() {
		if(!map) return;

		var dfd = $.Deferred();

		function handleLocationError(browserHasGeolocation) {
		  alert(browserHasGeolocation ?
		                        'Error: The Geolocation service failed.' :
		                        'Error: Your browser doesn\'t support geolocation.');
		}

		// Check Support on HTML5 geolocation.
		if (navigator.geolocation) {
		  navigator.geolocation.getCurrentPosition(function(position) {

		    var pos = {
		      lat: position.coords.latitude,
		      lng: position.coords.longitude
		    };

		    if( userLocation) {
		    	userLocation.setPosition(pos);
		    } else {
			    userLocation = new google.maps.Marker({
			    		position: pos,
			    		map: map,
			    		title: "Current Location",
			    		icon: 'img/bluedot_retina.png',
			    		optimized: false
			    	});

			    google.maps.event.addListener(userLocation, 'click', function() {
					// Reverse Geocode Latlng to Address 
					$.when(reverseGeocode(userLocation.getPosition())).then(function(results) {
						var address = results[0].formatted_address;

						var infoContent =  "<div class='userInfowindow'>";
					   		infoContent += "<div class='locationLabel'><b>Current Location</b></div> <br/>";
					        infoContent += "Address: <b>"+address+"</b> <br/>";
					        infoContent += "</div>";

						var infowindow = new google.maps.InfoWindow({
				 			content: infoContent
						});

			   			infowindow.open(map, userLocation);  
					});
		   		});
		    }

		    map.panTo(pos);
		    map.setZoom(15);

		    dfd.resolve();

		  }, function(err) {
		  	dfd.reject();
		  });

		} else {
		  // Browser doesn't support Geolocation
		  handleLocationError(false);
		  dfd.reject();
		}
		return dfd.promise();
	}


	function showDirections(origin, dest) {
		 var request = {
		     origin : origin,
		     destination : dest,
		     travelMode : google.maps.DirectionsTravelMode.DRIVING
		 }
		 directionsService.route(request, function(response, status) {
		    if(status == google.maps.DirectionsStatus.OK) {
		     directionsDisplay.setDirections(response);
		    }
		 });
	}


	function showStoreDirection(userLocationParam, storeLocation) {
		$('#directions-panel').openModal({dismissible: false, opacity: 0});

		// a hack to allow map from panning
		$('.lean-overlay').remove();

		showDirections(userLocationParam, storeLocation);
	}

	function clearStoresPlaces() {
		storePlacesMarkers.forEach(function(store){
			store.setMap(null);
			store = null;
		});
		storePlacesMarkers = [];
	}

	function showStoresFromPlacesAPI(latLng, radiusParam) {
		var radius = radiusParam || 1000;


		var processResults = function (results, status, pagination) {
			if (status !== google.maps.places.PlacesServiceStatus.OK) return;

			// Clear markers from previous
			clearStoresPlaces();


			results.forEach(function(place, index) {

				var storeLatLng = place.geometry.location;

				var store = new google.maps.Marker({
			    	position: storeLatLng,
			    	title: place.name,
			    	map: map,
		    		icon: "img/store.png"
			   });

				store.name    		  = place.name; 
				store.address  		  = place.vicinity;
			    storePlacesMarkers[index] = store;

				var infoContent =  "<div class='storeInfowindow'>";
					infoContent += "Store: <b>"+store.name+"</b> <br/>";
				    infoContent += "Address: <b>"+store.address+"</b> <br/>";
				    infoContent += "<div class='infowindow-controls'>";
				    infoContent += "<a data-store-index='"+index+"' class='waves-effect waves-light btn getStorePlacesDirection'>Get Directions</a>";
				    infoContent += "</div>";
				    infoContent += "</div>";

				var infowindow = new google.maps.InfoWindow({
					content: infoContent
				});

				google.maps.event.addListener(storePlacesMarkers[index], 'click', function() {
			   		infowindow.open(map, store);  
		   		});
			});

		};

		var request = {
		  location: {lat: latLng.lat(), lng: latLng.lng()},
		  radius: radius,
		  types: ['store']
		};

		placesService.nearbySearch(request, processResults);
	}

	function displayDistanceMatrix(response, status) {
		if (status != google.maps.DistanceMatrixStatus.OK) return;

		var origins = response.originAddresses;
		var destinations = response.destinationAddresses;

		console.log(origins);
		console.log(destinations);

		var collectionList = document.getElementById('distance-collection');


	    // use outputDiv for printing this result
	    for (var i = 0; i < origins.length; i++){
	      var results = response.rows[i].elements;
	      for (var j = 0; j < results.length; j++){
	        var elements = results[j];
	        var distance = elements.distance.text;
	        var duration = elements.duration.text;
	        var from = origins[i];
	        var to = destinations[j];

	        var li = document.createElement('li');
	        li.className = 'collection-item';

	        li.innerHTML += "<b>" + from + "</b> to <b>" + to + "</b> : <b>" + distance + "</b> in <b>" + duration + "</b><br/>";
	      	collectionList.appendChild(li);
	      }
	    }

	}

	function showStoreDistance(userLocation) {
		var originsArray = [],
		    destinationsArray = [];


		storeMarkers.forEach(function(store, index) {
			if(destinationsArray.length > 5) return;
			originsArray.push(userLocation);
			destinationsArray.push(store.getPosition());
		});

		distanceService.getDistanceMatrix(
		{
			origins: originsArray,
			destinations: destinationsArray,
			travelMode: google.maps.TravelMode.DRIVING,
			unitSystem: google.maps.UnitSystem.METRIC,
			avoidHighways: false,
			avoidTolls: false
		}, displayDistanceMatrix);


	}

	// Show User Current Location
	$('#btn-user-location').on('click', function(e) {
		e.preventDefault();

		$.when(getCurrentLocation()).then(function(res){
			console.log(res);
		});
	});

	$('.modal-trigger').leanModal({dismissible: false, opacity: 0});

	// Show Store Direction from User Current Location
	$('body').on('click', '.getStoreDirection', function(e) {
		e.preventDefault();

		var index = $(this).data('store-index');
		
		if(storeMarkers[index]) {

			$.when(getCurrentLocation()).then(
				function( status ){
					console.log(userLocation);

					showStoreDirection(userLocation.getPosition(), storeMarkers[index].getPosition());
			}, function (){ console.log('error'); })
		}
	});

	// Show Store Places Direction from User Current Location
	$('body').on('click', '.getStorePlacesDirection', function(e) {
		e.preventDefault();

		var index = $(this).data('store-index');
		
		if(storePlacesMarkers[index]) {

			$.when(getCurrentLocation()).then(
				function( status ){
					console.log(userLocation);

					showStoreDirection(userLocation.getPosition(), storePlacesMarkers[index].getPosition());
			}, function (){ console.log('error'); })
		}
	});

	// Show Nearby Stores from user current location
	$('#btn-nearby-stores').on('click', function () {
		// Show Radius Modal
		$('#radius-panel').openModal({dismissible: false, opacity: 0});
		// a hack to allow map from panning
		$('.lean-overlay').remove();

		$.when(getCurrentLocation()).then(function(res){
			// show nearby stores from location
			var elemRadius = document.getElementById('txtRadius');
			var radius = elemRadius ? elemRadius.value : 1000;

			showStoresFromPlacesAPI(userLocation.getPosition(), radius);
		});
	});

	// Show Stores Distances from User Current Location
	$('#btn-store-distance').on('click', function() {

		$.when(getCurrentLocation()).then(
			function( status ){
				$('#distance-panel').openModal({dismissible: false, opacity: 0});
				// a hack to allow map from panning
				$('.lean-overlay').remove();

				showStoreDistance(userLocation.getPosition());
		}, function (){ console.log('error'); })
	});

 
});

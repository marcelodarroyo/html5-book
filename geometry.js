Geometry = {

	toRadians: function (degrees) {
		return degrees * Math.PI / 180;
	},

	toDegrees: function (radians) {
		return radians * 180 / Math.PI;
	},

	// Get center of rectangle
	centerOfRectangle: function(rect) {
		return {
			x: rect.x + rect.w / 2,
			y: rect.y + rect.h / 2
		};
	},

	isPointInRectangle: function(point, rect) {
		console.log('Point (' + point.x + ',' + point.y + ') in ' +
			rect.x + ' - ' + rect.y + ' - ' + rect.w + ' - ' + rect.h);
		return point.x >= rect.x && point.x <= rect.x+rect.w && 
		       point.y >= rect.y && point.y <= rect.y+rect.h;
	},

	isPointInCircle: function(point, circle) {
		var dx = Math.abs(point.x - circle.x);
		var dy = Math.abs(point.y - circle.y);
		return Math.sqrt(dx * dx + dy * dy) < circle.r;
	},

	rotatedPoint: function (point, center, radians) {
		if ( radians == 0 )
			return point;
		var x = point.x - center.x, 
		    y = point.y - center.y,
		    result;
		result = {
			x: (x * Math.cos(radians) - y * Math.sin(radians)) + center.x,
			y: (x * Math.sin(radians) + y * Math.cos(radians)) + center.y
		};
		return result;
	},

	// Return rotated point positions giving a center rotation point and angle
	rotatedPoints: function (points, center, radians) {
		if ( radians == 0 )
			return points;
		var result = [];
		for ( var i=0; i < points.length; i++ ) {
			result[i] = this.rotatedPoint(points[i], center, radians);
		}
		return result;
	}

}; // end of GEOMETRY namespace object

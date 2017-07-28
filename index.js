var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-neomekit", "Neomekit", Neomekit);
};

function Neomekit(log, config) {
    this.log = log.debug;
	this.service = "Light";
	this.name = config.name || "Neomekit bulb";
	this.ip = config.ip;
	this.port = config.port || 80;
	this.cache = {
		brightness: 0,
		hue: 0,
		saturation: 0
	};
}

Neomekit.prototype = {
	identify: function(callback) {
		callback();
	},
	getServices: function() {
		var informationService = new Service.AccessoryInformation();
		informationService
			.setCharacteristic(Characteristic.Manufacturer, "hug33k")
			.setCharacteristic(Characteristic.Model, "homebridge-neomekit")
			.setCharacteristic(Characteristic.SerialNumber, "NMKT-v1");
		switch (this.service) {
			case "Light":
				var lightbulbService = new Service.Lightbulb(this.name);
				lightbulbService
					.getCharacteristic(Characteristic.On)
					.on("get", this.getPowerState.bind(this))
					.on("set", this.setPowerState.bind(this));
				lightbulbService
					.addCharacteristic(new Characteristic.Brightness())
					.on("get", this.getBrightness.bind(this))
					.on("set", this.setBrightness.bind(this));
				lightbulbService
					.addCharacteristic(new Characteristic.Hue())
					.on("get", this.getHue.bind(this))
					.on("set", this.setHue.bind(this));
				lightbulbService
					.addCharacteristic(new Characteristic.Saturation())
					.on("get", this.getSaturation.bind(this))
					.on("set", this.setSaturation.bind(this));
				return [lightbulbService];
			default:
				return [informationService];
		}
	},
	getPowerState: function(callback) {
		var url = this._makeURL("power");
		this._httpRequest(url, "", "GET", function(error, response, responseBody) {
			if (error) {
				this.log("getPowerState() failed: %s", error.message);
				callback(error);
			} else {
				var status = JSON.parse(responseBody).power;
				this.log("Power is currently %s", status ? "ON" : "OFF");
				callback(null, status);
			}
		}.bind(this));
	},
	setPowerState: function(state, callback) {
		var url = this._makeURL("power");
		var body = {
			power: state
		};
		this._httpRequest(url, body, "POST", function(error, response, responseBody) {
			if (error) {
				this.log("setPowerState() failed: %s", error.message);
				callback(error);
			} else {
				this.log("setPowerState() successfully set to %s", state ? "ON" : "OFF");
				callback(undefined, responseBody);
			}
		}.bind(this));
	},
	getBrightness: function(callback) {
		var url = this._makeURL("brightness");
		this._httpRequest(url, "", "GET", function(error, response, responseBody) {
			if (error) {
				this.log("getBrightness() failed: %s", error.message);
				callback(error);
			} else {
				var level = JSON.parse(responseBody).brightness * 100 / 255;
				this.log("Brightness is currently at %s %", level);
				this.cache.brightness = level;
				callback(null, level);
			}
		}.bind(this));
	},
	setBrightness: function(level, callback) {
		var url = this._makeURL("brightness");
		var body = {
			brightness: parseInt(level * 255 / 100)
		};
		this._httpRequest(url, body, "POST", function(error, response, body) {
			if (error) {
				this.log("setBrightness() failed: %s", error);
				callback(error);
			} else {
				this.log("setBrightness() successfully set to %s %", level);
				this.cache.brightness = level;
				callback();
			}
		}.bind(this));
	},
	getHue: function(callback) {
		var url = this._makeURL("color");
		this._httpRequest(url, "", "GET", function(error, response, responseBody) {
			if (error) {
				this.log("getHue() failed: %s", error.message);
				callback(error);
			} else {
				var rgb = JSON.parse(responseBody);
				var levels = this._rgbToHsl(
					parseInt(rgb.red,10),
					parseInt(rgb.green,10),
					parseInt(rgb.blue,10)
				);
				var hue = levels[0];
				this.log("Hue is currently %s", hue);
				callback(null, hue);
			}
		}.bind(this));
	},
	setHue: function(level, callback) {
		this.cache.hue = level;
		this._setRGB(callback);
	},
	getSaturation: function(callback) {
		var url = this._makeURL("color");
		this._httpRequest(url, "", "GET", function(error, response, responseBody) {
			if (error) {
				this.log("getSaturation() failed: %s", error.message);
				callback(error);
			} else {
				var rgb = JSON.parse(responseBody);
				var levels = this._rgbToHsl(
					parseInt(rgb.red,10),
					parseInt(rgb.green,10),
					parseInt(rgb.blue,10)
				);
				var saturation = levels[1];
				this.log("Saturation is currently %s", saturation);
				callback(null, saturation);
			}
		}.bind(this));
	},
	setSaturation: function(level, callback) {
		this.cache.saturation = level;
		this._setRGB(callback);
	},
	_setRGB: function(callback) {
		var rgb = this._hsvToRgb(this.cache.hue, this.cache.saturation, this.cache.brightness);
		var body = {
			red: rgb.r,
			green: rgb.g,
			blue: rgb.b
		};
		var url = this._makeURL("color");
		this._httpRequest(url, body, "POST", function(error, response, body) {
			if (error) {
				this.log("_setRGB() failed: %s", error);
				callback(error);
			} else {
				this.log("_setRGB() successfully set to R:%s G:%s B:%s", body.red + body.green + body.blue);
				callback();
			}
		}.bind(this));
	},
	_makeURL: function(path) {
		return "http://" + this.ip + ":" + this.port + "/" + path;
	},
	_httpRequest: function(url, body, method, callback) {
		request({
				url: url,
				body: JSON.stringify(body),
				method: method
			},
			function(error, response, body) {
				callback(error, response, body);
			});
	},
	_hsvToRgb: function(h, s, v) {
		var r, g, b, i, f, p, q, t;
		h /= 360;
		s /= 100;
		v /= 100;
		i = Math.floor(h * 6);
		f = h * 6 - i;
		p = v * (1 - s);
		q = v * (1 - f * s);
		t = v * (1 - (1 - f) * s);
		switch (i % 6) {
			case 0:
				r = v; g = t; b = p;
				break;
			case 1:
				r = q; g = v; b = p;
				break;
			case 2:
				r = p; g = v; b = t;
				break;
			case 3:
				r = p; g = q; b = v;
				break;
			case 4:
				r = t; g = p; b = v;
				break;
			case 5:
				r = v; g = p; b = q;
				break;
		}
		return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
	},
	_rgbToHsl: function(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;
		if (max === min)
			h = s = 0;
		else {
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		h *= 360;
		s *= 100;
		l *= 100;
		return [parseInt(h), parseInt(s), parseInt(l)];
	}
};

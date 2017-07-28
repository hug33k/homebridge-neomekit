# Homebridge-Neomekit

💡 Homebridge plugin for Neomekit devices

## What is a Neomekit device ?

`Neomekit` is a Python server for managing Neopixels LEDs.

Server is available [here](https://github.com/hug33k/Neomekit).

## How to use it ?

First, install this plugin
````sh
$> npm install -g homebridge-neomekit
````

Then add your accessory in `~/.homebridge/config.json`
````json
{
	...
	"accessories": [
		...,
    	{
			"accessory": "Neomekit",
			"name": "My Neopixels",
			"ip": "127.0.0.1",
			"port": 80
		},
		...
	]
	...
}
````
( `Port` isn't mandatory, default value is `80` )

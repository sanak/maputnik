import { colorizeLayers } from './style.js'
import Immutable from 'immutable'

const storagePrefix = "mapolo"
const storageKeys = {
	latest: [storagePrefix, 'latest_style'].join(''),
	accessToken: [storagePrefix, 'access_token'].join('')
}

// Empty style is always used if no style could be restored or fetched
const emptyStyle = ensureOptionalStyleProps(Immutable.fromJS({
		version: 8,
		sources: {},
		layers: [],
}))

const defaultStyleUrl = "https://raw.githubusercontent.com/osm2vectortiles/mapbox-gl-styles/master/styles/basic-v9-cdn.json"

// Fetch a default style via URL and return it or a fallback style via callback
export function loadDefaultStyle(cb) {
	var request = new XMLHttpRequest();
	request.open('GET', defaultStyleUrl, true);

	request.onload = () => {
		if (request.status >= 200 && request.status < 400) {
			cb(Immutable.fromJS(JSON.parse(request.responseText)))
		} else {
			cb(emptyStyle)
		}
	};

	request.onerror = function() {
			console.log('Could not fetch default style')
			cb(emptyStyle)
	};

	request.send();
}

// Return style ids and dates of all styles stored in local storage
function loadStoredStyles() {
	const styles = []
	for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if(isStyleKey(key)) {
				styles.push(fromKey(key))
			}
	}
	return styles
}

function isStyleKey(key) {
	const parts = key.split(":")
	return parts.length == 2 && parts[0] === storagePrefix
}

// Load style id from key
function fromKey(key) {
	if(!isStyleKey(key)) {
		throw "Key is not a valid style key"
	}

	const parts = key.split(":")
	const styleId = parts[1]
	return styleId
}

// Calculate key that identifies the style with a version
function styleKey(styleId) {
	return [storagePrefix, styleId].join(":")
}

// Ensure a style has a unique id and a created date
function ensureOptionalStyleProps(mapStyle) {
		if(!('id' in mapStyle)) {
			mapStyle = mapStyle.set('id', Math.random().toString(36).substr(2, 9))
		}
		if(!("created" in mapStyle)) {
			mapStyle = mapStyle.set('created', new Date())
		}
		return mapStyle
}

// Store style independent settings
export class SettingsStore {
	get accessToken() {
		const token = window.localStorage.getItem(storageKeys.accessToken)
		return token ? token : ""
	}
	set accessToken(val) {
		window.localStorage.setItem(storageKeys.accessToken, val)
	}
}

// Manages many possible styles that are stored in the local storage
export class StyleStore {
	// Tile store will load all items from local storage and
	// assume they do not change will working on it
	constructor() {
		this.mapStyles = loadStoredStyles()
	}

	// Find the last edited style
	latestStyle() {
		if(this.mapStyles.length == 0) return emptyStyle
		const styleId = window.localStorage.getItem(storageKeys.latest)
		const styleItem = window.localStorage.getItem(styleKey(styleId))
		return Immutable.fromJS(JSON.parse(styleItem))
	}

	// Save current style replacing previous version
	save(mapStyle) {
		if(!(mapStyle instanceof Immutable.Map)) {
			mapStyle = Immutable.fromJS(mapStyle)
		}
		mapStyle = ensureOptionalStyleProps(mapStyle)
		const key = styleKey(mapStyle.get('id'))
		window.localStorage.setItem(key, JSON.stringify(mapStyle.toJS()))
		window.localStorage.setItem(storageKeys.latest, mapStyle.get('id'))
		return mapStyle
	}
}
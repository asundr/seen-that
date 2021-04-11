"use strict";

/* ============ Constants ============ */

const Preview_Progress_Bar_Selector = 'ytd-thumbnail-overlay-resume-playback-renderer';

const Home_Pattern = /youtube.com\/?(?:\?.*)?$/;
const Home_Container_Selector = '#primary #contents.ytd-rich-grid-renderer';
const Home_Renderer_Selector = ".ytd-rich-grid-renderer";

const Subscriptions_Pattern = /youtube.com\/feed\/subscriptions(\?flow\=1)?/;
const Subscriptions_Container_Selector = '#contents';
const Subscriptions_Renderer_Selector = 'ytd-grid-video-renderer';

const Channel_Pattern = /youtube.com\/(?:user|channel|c)\/[\d\w\-]+\/videos/;
const Channel_Container_Selector = 'dom-if + #items';
const Channel_Renderer_Selector = ".ytd-grid-renderer";

const Search_Pattern = /youtube.com\/results/;
const Search_Container_Selector = '#container  #contents #spinner-container + #contents'; // Not exact, see usage
const Search_Renderer_Selector = ".ytd-item-section-renderer";

const Watch_Pattern = /youtube.com\/watch/;
const Watch_Container_Selector = '#related #items';
const Watch_Renderer_Selector = '.ytd-compact-video-renderer';

const Playlist_Renderer_Selector = '.ytd-compact-playlist-renderer';
const Mix_Renderer_Selector = '.ytd-compact-radio-renderer';

const Watch_Renderer_TagName = 'ytd-compact-video-renderer';
const Playlist_Renderer_TagName = 'ytd-compact-playlist-renderer';
const Mix_Renderer_TagName = 'ytd-compact-radio-renderer';

const Dismissable_Prefix = '#dismissable';

const EndScreen_ClassName = 'ytp-endscreen-content';
const Renderer_Href_ClassName = 'yt-simple-endpoint';

const Watch_ID_Pattern = /watch\?(?:[^v]+=[\w\d\-]+&)*(?:v=([\w\d\-]+))/;
const Progress_Bar_Width_Pattern = /(^\d{1,3})%$/;

const Default_Init_Delay = 100;
const Maximum_Init_Delay = 60000;

const Update_Interval = 1000;
const EndScreen_Check_Interval = 1000;

const EndScreen_Disabled_Opacity = '0.1';
const EndScreen_Disabled_ZIndex = '-1';

const RendererType = {
	Normal: 'normal',
	Mix: 'mix',
	Playlist: 'playlist'
}


/* ============ Variables ============ */

var debugMode = false;
var options;
var currHref = document.location.href;
var oldContainer;
var container;
var rendererSelector;
var endScreen;

var endScreenTimeout;
var initDelay = Default_Init_Delay;
var updateTimeout;
var updateTime = 0;

var idMap = {};


/* ============ Subscribe to Events ============ */

// Starts the script once a youtube page has loaded
window.readyState === "complete" ? init() : document.addEventListener('readystatechange', () => {
	if (document.readyState === "complete")
		updateOptions();
		init();
}, false);

// Updates script when navigating between YouTube pages
window.addEventListener('yt-navigate-start', () => {
	updateOptions();
	init();
}, false);

// Updates script when going forward / backwards through history
window.addEventListener('popstate', (event) => {
	updateOptions();
	init();
}, false);


/* ============ Update Functions ============ */

// Used to group rapidly occuring update events into a single update
function onUpdateBar(force) {
	let time = (new Date()).getTime();
	if (force === true || time >= updateTime) {
		updateTime = time + Update_Interval;
		updateDisplay();
	} 
	if (updateTimeout)
		clearTimeout(updateTimeout);
	updateTimeout = setTimeout( function() {
		updateTimeout = null;
		updateDisplay();
	}, updateTime - time + Update_Interval);
}

// Sets video recommendations as visible or hidden depending on user preferences
function updateDisplay() {
	if (!options) {
		updateOptions();
		return;
	} else if (!container) {
		return init();
	}

	let active = enabled();
	let recs = container.querySelectorAll(rendererSelector);
	toggleRenderer(recs, x => active && options.bWatched && hasWatched(x), 'green');

	if (Watch_Pattern.exec(window.location.href)){
		updateWatchScreen(active, recs);
	}
}

// Updates specific to video watch pages
function updateWatchScreen(active, recs){
	let mix = container.querySelectorAll(Mix_Renderer_TagName);
	let playlists = container.querySelectorAll(Playlist_Renderer_TagName);
	toggleRenderer(mix, x => active && options.bMix, 'blue');
	toggleRenderer(playlists, x => active && options.bPlaylist, 'red');
	let upnext = [...recs, ...mix, ...playlists];
	renderListToMap(upnext);
	updateEndScreen(active);
}

// Updates the endscreen suggestion that show when a video ends
function updateEndScreen(active) {
	if (!document.body.contains(endScreen)) {
		endScreen = undefined;
		initEndScreen();
		return;
	} else if (endScreen.children.length < 2) {
		return;
	}

	let endRecs = [...endScreen.children];
	if (!hasUrlForAll(endRecs)) {
		return;
	}

	for (var i=0; i < endRecs.length; ++i) {
		let id = getVideoIdFromHref(endRecs[i].href);
		if (!id || !idMap[id]) {
			if (debugMode) console.log("no id match: ", id, endRecs[i]);
			continue;
		}
		let hide = shouldHideElement(idMap[id]);
		endRecs[i].style.opacity = active && hide ? EndScreen_Disabled_Opacity : '';
		endRecs[i].style.zIndex  = active && hide ? EndScreen_Disabled_ZIndex  : '';
	}
}


/* ============ Init Functions ============ */

// Sets the container Elmeent and video selector for a given page
function init(){
	idMap = {};
	if (Home_Pattern.exec(window.location.href)) {
		//console.log('home');
		container = document.querySelector(Home_Container_Selector);
		rendererSelector = Home_Renderer_Selector;
	} else if (Channel_Pattern.exec(window.location.href)) {
		//console.log('channel');
		container = document.querySelector(Channel_Container_Selector);
		rendererSelector = Channel_Renderer_Selector;
	} else if (Search_Pattern.exec(window.location.href)) {
		//console.log('search');
		let matches =  document.querySelectorAll(Search_Container_Selector);
		container = matches[matches.length-1];
		rendererSelector = Search_Renderer_Selector;
	} else if (Watch_Pattern.exec(window.location.href)) {
		//console.log('video');
		endScreen = undefined;
		initEndScreen();
		container = document.querySelector(Watch_Container_Selector);
		rendererSelector = Watch_Renderer_TagName;
	} else if (Subscriptions_Pattern.exec(window.location.href)) {
		//console.log('subscriptions');
		container = document.querySelector(Subscriptions_Container_Selector);
		rendererSelector = Subscriptions_Renderer_Selector;
	} else {
		console.log('unhandled youtube page', window.location.href);
		return;
	}
	// return if no contaier or if old container doesn't match new url
	if ( !container || currHref !== window.location.href && container === oldContainer && !(Watch_Pattern.exec(currHref) && Watch_Pattern.exec(window.location.href)) ){
		setTimeout(() => init(), (initDelay = Math.min(initDelay*1.5, Maximum_Init_Delay)));
		return;
	}
	currHref = document.location.href;
	oldContainer = container;
	container.addEventListener ('DOMNodeInserted', onUpdateBar, false);
	initDelay = Default_Init_Delay;
	onUpdateBar();
}

// Sets the reference to the endscreen
function initEndScreen() {
	endScreen = document.getElementsByClassName(EndScreen_ClassName)[0];
	if (!endScreen && Watch_Pattern.exec(window.location.href))
		endScreenTimeout = setTimeout(initEndScreen, EndScreen_Check_Interval);
	else {
		endScreen.addEventListener('DOMNodeInserted', () => {onUpdateBar();}, false);
		onUpdateBar();
	}
}


/* ============ Helper Functions ============ */

// Populates a map with video urls that point to corresponding elements and info
function renderListToMap(list){
	list.forEach((c,i) => {
		let a = c.getElementsByTagName('a');
		if (!a[1])
			return;
		let href = getVideoIdFromHref(a[1].href);
		if (!idMap[href])
			idMap[href] = {};
		let e = idMap[href];
		e.element = c;
		e.index = i;
		let tagName = c.tagName.toLowerCase();
		e.type = tagName === Watch_Renderer_TagName ? RendererType.Normal 
			: tagName === Playlist_Renderer_TagName ? RendererType.Playlist 
			: tagName === Mix_Renderer_TagName ? RendererType.Mix
			: "unknown";
		e.percent = getViewPercent(c);
	});
}

// Includes endscreen elements in video map
function updateMapWithEndscren(endRecs){
	endRecs.forEach(c => {
		if (!c.href || !c.href.length)
			return console.log(c);
		let id = getVideoIdFromHref(c.href);
		if (!id)
			return console.log(c);
		if (!idMap[id])
			idMap[id] = {};
		idMap[id].endElement = c;
	});
}

// Returns true if the passed element info contains an element can cat be hidden
function shouldHideElement(elem) {
	let hide = false;
	if (elem.type === RendererType.Normal) {
		hide = options.bWatched && hasWatched(elem.element);
	} else if (elem.type === RendererType.Playlist) {
		hide = options.bPlaylist;
	} else if (elem.type === RendererType.Mix){
		hide = options.bMix;
	} else {
		console.log("Cannot identify renderer: ", elem);
	}
	return hide;
}

// Toggles the visible / hidden state on items given a condition
// If debug mode is active, toggles background colour
function toggleRenderer(list, condition, colour){
	if (debugMode){
		applyToList(list, x => x.style.backgroundColor = condition(x) ? colour : '');
	} else {
		applyToList(list, x => x.style.display = condition(x) ? 'none' : '');
	}
}

// returns true if every element in the list has a url
function hasUrlForAll(list){
	return list.reduce((a,c) => a && c && c.href && c.href.length, true);
}

// Returns true if the video has watched at least the threshhold percent
function hasWatched(videoRenderer){
	return getViewPercent(videoRenderer) >= options.threshhold;
}

// Rerturns the percentage watched of a video based on its progress bar
function getViewPercent(videoRenderer){
	let bar = videoRenderer.getElementsByClassName(Preview_Progress_Bar_Selector)[0];
	if (!bar)
		return 0;
	let wid = Progress_Bar_Width_Pattern.exec(bar.style.width);
	if (!wid || wid.length < 2){
		console.log("bad renderer: ", videoRenderer, wid);
		return 0;
	}
	return Number(wid[1]);
}

// Performs an action to each element of a list that meets the passed condition
// (true by default). Returns the number that passed the condition.
function applyToList(list, action, condition){
	let count = 0;
	for (var x of list) 
		if (condition === undefined || condition(x)) {
			action(x);
			++count;
		}
	return count;
}

// Determines if the current url should hide video suggestions 
function enabled() {
	return Home_Pattern.exec(window.location.href) && options.bHome
		|| Subscriptions_Pattern.exec(window.location.href) && options.bSubs
		|| Channel_Pattern.exec(window.location.href) && options.bChannel
		|| Search_Pattern.exec(window.location.href) && options.bSearch
		|| Watch_Pattern.exec(window.location.href) && options.bNext;
}

// Returns video Id from a renderer class name
function getVideoIdFromRenderer(renderer) {
	let href = renderer.getElementsByClassName(Renderer_Href_ClassName)[1].href;
	return getVideoIdFromHref(href);
}

// Returns the video id from a youtube watch link
function getVideoIdFromHref(href) {
	if (!href || !href.length) {
		console.log('Invalid href: ', href);
		return null;
	}
	return Watch_ID_Pattern.exec(href)[1];
}


/* ============ Chrome Functions ============ */

// Responds to messages, used for updating loaded pages
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {
	if (response === 'updatePage'){
		updateOptions();
		onUpdateBar(true);
	} else if (response.options) {
		options = response.options;
		onUpdateBar(true);
	}
});

// Updates local options from storage
function updateOptions(){
	chrome.storage.sync.get('options', function(data) {
		options = data.options;
	});
}

// Saves local options to storage (Needs checking)
function saveOptions(){
	chrome.storage.sync.set({ options: options })
}

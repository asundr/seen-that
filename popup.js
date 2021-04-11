"use strict";

var options;

let autoBox 		= document.getElementById('bAutoPlaylist');
let playlistBox 	= document.getElementById('bPlaylist');
let watchedBox 		= document.getElementById('bWatched');
let threshhold 		= document.getElementById('threshhold');
let nextBox 		= document.getElementById('bNext');
let homeBox 		= document.getElementById('bHome');
let subBox 			= document.getElementById('bSubs');
let channelBox 		= document.getElementById('bChannel');
let searchBox 		= document.getElementById('bSearch');

chrome.storage.sync.get('options', function(data) {
	watchedBox.checked 		= data.options.bWatched;
	playlistBox.checked 	= data.options.bPlaylist;
	autoBox.checked 		= data.options.bMix;
	threshhold.value 		= data.options.threshhold;
	nextBox.checked 		= data.options.bNext;
	homeBox.checked 		= data.options.bHome;
	subBox.checked 			= data.options.bSubs;
	channelBox.checked 		= data.options.bChannel;
	searchBox.checked 		= data.options.bSearch;
});

autoBox.addEventListener('change', () => {
	options.bMix = autoBox.checked;
	updatePage();
}, false);

playlistBox.addEventListener('change', () => {
	options.bPlaylist = playlistBox.checked;
	updatePage();
}, false);

watchedBox.addEventListener('change', () => {
	options.bWatched = watchedBox.checked;
	updatePage();
}, false);

threshhold.addEventListener('change', () => {
	options.threshhold = Math.min(100, Math.max(0, Number(threshhold.value)));
	threshhold.value = options.threshhold;
	updatePage();
}, false);

nextBox.addEventListener('change', () => {
	options.bNext = nextBox.checked;
	updatePage();
}, false);

homeBox.addEventListener('change', () => {
	options.bHome = homeBox.checked;
	updatePage();
}, false);

subBox.addEventListener('change', () => {
	options.bSubs = subBox.checked;
	updatePage();
}, false);

channelBox.addEventListener('change', () => {
	options.bChannel = channelBox.checked;
	updatePage();
}, false);

searchBox.addEventListener('change', () => {
	options.bSearch = searchBox.checked;
	updatePage();
}, false);

function updatePage(){
	storageSet('options', options);
	sendMessage(({options: options}));
}

function sendMessage(message){
	chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, message);
	});
}

function updateOptions(){
	chrome.storage.sync.get('options', function(data) {
		options = data.options;
	});
}

function storageSet(key, val){
	let obj = {};
	obj[key] = val;
	chrome.storage.sync.set(obj, function(){});
}

updateOptions();
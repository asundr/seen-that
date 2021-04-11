'use strict';

const Default_Threshhold 				= 90;
const Default_Hide_Watched 				= true;
const Default_Hide_AutoPlaylist 		= true;
const Default_Hide_UserPlaylists 		= false;
const Default_EnablePage_Video 			= true;
const Default_EnablePage_Home 			= true;
const Default_EnablePage_Subscriptions 	= true;
const Default_EnablePage_Channel 		= false;
const Default_EnablePage_Search 		= false;


chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [new chrome.declarativeContent.PageStateMatcher({
				pageUrl: {hostEquals: 'www.youtube.com'},
			})
			],
				actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
	storageSet('options', initStorage());
});

function initStorage(){
	return {
		bMix: 		Default_Hide_AutoPlaylist,
		bWatched: 	Default_Hide_Watched,
		bPlaylist: 	Default_Hide_UserPlaylists,
		bSubs: 		Default_EnablePage_Subscriptions,
		threshhold: Default_Threshhold,
		bSearch: 	Default_EnablePage_Search,
		bChannel: 	Default_EnablePage_Channel,
		bHome: 		Default_EnablePage_Home,
		bNext: 		Default_EnablePage_Video
	};
}

function storageSet(key, val){
	let obj = {};
	obj[key] = val;
	chrome.storage.sync.set(obj, function(){});
}
'use strict';

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
	return {bMix:true, bWatched:true, bPlaylist:false, bSubs:true, threshhold:100, bSearch:false, bChannel:false, bHome:true, bNext:true};
}

function storageSet(key, val){
	let obj = {};
	obj[key] = val;
	chrome.storage.sync.set(obj, function(){});
}
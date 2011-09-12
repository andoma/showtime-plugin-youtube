/**
 * Youtube plugin for showtime version 0.1  by facanferff (Fábio Canada / facanferff@hotmail.com)
 *
 *  Copyright (C) 2011 facanferff (Fábio Canada / facanferff@hotmail.com)
 *
 * 	ChangeLog:
 *	0.1:
 *	- Start work
 * 
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


(function(plugin) {

    var PREFIX = 'youtube';
    var api;

    var service = plugin.createService("Youtube", PREFIX + ":start", "tv", true,
	plugin.path + "logo.png");
                           
    var settings = plugin.createSettings("Youtube",
					  plugin.path + "logo.png",
					 "Youtube: Video Sharing Service");

    settings.createInt("maxresults", "Max results for request", 25, 1, 50, 1, '', function(v) {
        service.maxresults = v;
    });
    

function startPage(page) { 
    api = new Youtube_API();
    api.login();
    
    page.appendItem(PREFIX + ':mixfeeds:'+ 'standard_feeds', 'directory', {title: 'Standard Feeds'})
    //page.appendItem(PREFIX + ':mixfeeds:'+ 'channel_feeds', 'directory', {title: 'Channel Feeds'})
    //page.appendItem(PREFIX + ':mixfeeds:'+ 'live_events_feeds', 'directory', {title: 'Live Events Feeds'})
    page.appendItem(PREFIX + ':mixfeeds:'+ 'movie_feeds', 'directory', {title: 'Movie Feeds'})
    page.appendItem(PREFIX + ':mixfeeds:'+ 'trailer_feeds', 'directory', {title: 'Trailer Feeds'})
    
    page.appendItem(PREFIX + ':search:'+ escape('https://gdata.youtube.com/feeds/api/videos'), 'directory', {title: 'Search'})
    
    page.appendItem(PREFIX + ':video:' + '_i2RCBa3l-g',"directory", {title: 'Test - Video'});
    page.appendItem(PREFIX + ':video:' + 'szHO-wEmvio',"directory", {title: 'Test2 - Video'});
    
    if (api.logged_in) {
        page.appendItem(PREFIX + ':mixfeeds:'+ 'user_feeds', 'directory', {title: 'User Feeds'})
    }
    
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    
    page.metadata.title = "Youtube - Home Page";
  }
  
  plugin.addURI(PREFIX + ":mixfeeds:(.*)", function(page, type) {
    page.metadata.title = 'Youtube';
    page.metadata.logo = plugin.path + "logo.png";
    
    for each (var entry in api[type])
        page.appendItem(PREFIX + ':feed:' + escape(entry[1]),"directory", {title: entry[0]});
    
    page.type = "directory";
    page.contents = "items"
    page.loading = false;
  });
  
  plugin.addURI(PREFIX + ":search:(.*)", function(page, url) {
    page.metadata.title = 'Youtube';
    page.metadata.logo = plugin.path + "logo.png";
    
    var searchstring = showtime.textDialog('Search for: ', true, true)
    if (!searchstring.rejected) {
        searchstring = searchstring.input;
        searchstring=searchstring.replace(/ /g,'+');
        api.args_common.q=searchstring;
        var feed = showtime.JSONDecode(showtime.httpGet(unescape(url), api.args_common, api.headers_common).toString()).feed;
        delete api.args_common.q;
        delete api.args_common['start-index']
        getVideosList(page, feed);
    }
    
    page.type = "directory";
    page.contents = "items"
    page.loading = false;
  });
  
  function getVideosList(page, data) {
    for each (var entry in data.entry) {
            try {
                var id = entry.media$group.media$thumbnail[0].url.replace('http://i.ytimg.com/vi/','').replace('/default.jpg',''); 
                var rating = 0;
                try {
                    rating = parseFloat(entry.gd$rating.average) / 5.0
                }
                catch(err) {
                    showtime.print("Video "+id+" doesn't have a rating!");
                }
        
                var metadata = {
                    title: entry.title.$t,
                    icon: entry.media$group.media$thumbnail[0].url,
                    description: entry.media$group.media$description.$,
                    duration: secondsToTime(entry.media$group.yt$duration.seconds),
                    rating: rating
                };
        
                page.appendItem(PREFIX + ':video:' + id,"directory", metadata);
            }
            catch(err) {
                showtime.print(err)
            }
        }
        
        for each (var link in data.link) {
        if (link.rel == 'next') {
            var url_tmp = link.href.split('?');
            for each (var arg in url_tmp[1].split('&')) {
                var arg_name = arg.slice(0, arg.indexOf('='));
                var arg_value = arg.slice(arg.indexOf('=')+1)
                api.args_common[arg_name]=arg_value;
                showtime.print(arg_value)
            }
            page.appendItem(PREFIX + ':feed:' + escape(url_tmp[0]),"directory", {title: 'Next Page'});
        }
    }
  }
  
  plugin.addURI(PREFIX + ":feed:(.*)", function(page, url) {
    var feed = showtime.JSONDecode(showtime.httpGet(unescape(url), 
        api.args_common, api.headers_common).toString()).feed;
    delete api.args_common['start-index']
    page.metadata.title = feed.title.$t;
    page.metadata.logo = plugin.path + "logo.png";
    
    getVideosList(page, feed);
    
    page.type = "directory";
    page.contents = "items"
    page.loading = false;
  });
  
  plugin.addURI(PREFIX + ":video:(.*)", function(page, id) {
    var data = showtime.JSONDecode(showtime.httpGet('https://gdata.youtube.com/feeds/api/videos/' + id, {
        'alt' : 'json'
    }, api.headers_common).toString()).entry;
    var title = data.title.$t;
    page.metadata.title = title;
    page.metadata.icon = data.media$group.media$thumbnail[0].url;
    
    page.appendPassiveItem("label", data.media$group.media$category[0].$t);	
    
    // Try to get rating of a video
    try {
        page.appendPassiveItem("rating", parseFloat(data.gd$rating.average/5)); 
    }
    catch(err) {
        showtime.print("This videos doesn't have a rating!");
    }
    
    page.appendPassiveItem("label", data.author[0].name.$t, {title: "Author"});  
    page.appendPassiveItem("label", data.yt$statistics.viewCount, {title: "Views"});
    
    page.appendPassiveItem("label", secondsToTime(data.media$group.yt$duration.seconds), {title: "Duration"});   
    
    page.appendPassiveItem("bodytext", new showtime.RichText(data.media$group.media$description.$t));
    
    data = unescape(showtime.httpGet('http://www.youtube.com/get_video_info', {
        'video_id' : id
    }, api.headers_common).toString());
    
    var urls_start = -1;
    var videos = '';
    var mode = 'non-embedded';
    // Video is not embeddable
    if (data.indexOf('errorcode=150')!=-1){
        data = showtime.httpGet('http://www.youtube.com/watch?v='+id, null, api.headers_common).toString();
        videos = unescape(data.slice(data.indexOf('"url_encoded_fmt_stream_map": "url=')+35,
            data.indexOf('",', data.indexOf('"url_encoded_fmt_stream_map": "url=')))).split(',url=');
    }
    // Video is embeddable
    else {
        urls_start = data.indexOf('url_encoded_fmt_stream_map=url=')
        videos = unescape(data.slice(urls_start+31)).split(',url=');
        mode = 'embedded'
    }
    
    // Get each video link available
    for each (var video in videos) {
        var url;
        if (mode == 'non-embedded')
            url = video.slice(0, video.indexOf('\\u0026quality'))
        else
            url = video.slice(0, video.indexOf('quality'))
        
        var quality;
        if (mode == 'non-embedded')
            quality = video.slice(video.indexOf('quality=')+8, video.indexOf('\\u0026', video.indexOf('quality=')))
        else
            quality = video.slice(video.indexOf('quality=')+8, video.indexOf('&', video.indexOf('quality=')))
        var title_video = getResolution(quality)
        page.appendAction("navopen", PREFIX + ':video:stream:'+escape(title)+':'+escape(url), true, {      
            title: title_video    
        });
    }
    
    page.appendAction("navopen", PREFIX + ':feed:' + 
        escape('https://gdata.youtube.com/feeds/api/videos/'+id+'/related'), true, {
            title:'Related'})
        
    page.appendAction("navopen", PREFIX + ':feed:' + 
        escape('https://gdata.youtube.com/feeds/api/videos/'+id+'/responses'), true, {
            title:'Responses'})
    
    page.metadata.logo = plugin.path + "logo.png";
    page.type = "item";
    
    page.loading = false;
  });
  
  // We need to use this function so we can pass the correct title of video
  plugin.addURI(PREFIX + ":video:stream:(.*):(.*)", function(page, title, url) {
    page.loading = false;    
    page.source = "videoparams:" + showtime.JSONEncode({      
        title: unescape(title),     
        sources: [{	
            url: unescape(url)      
        }]    
    });    
    page.type = "video";
  });

// Transform secods to XXh: XXm: XXs
function secondsToTime(secs)
{
    var hours = Math.floor(secs / (60 * 60));
    
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);

    var divisor_for_seconds = divisor_for_minutes % 60;

    var seconds = Math.ceil(divisor_for_seconds);

    return hours + 'h: ' + minutes + 'm: ' + seconds + 's';
}

// Used to show available resolutions
function getResolution(quality)
{
    switch (quality) {
        case 'hd1080':
            return '1080p';
            break;
        case 'hd720':
            return '720p';
            break;
        case 'large':
            return '480p';
            break;
        case 'medium':
            return '360p';
            break;
        case 'small':
            return '240p';
            break;
    }
    // Should never get this value
    return 'unknown'
}


  
/*------------------------------------------------------------------------------
 * Functions for Youtube API
 -----------------------------------------------------------------------------*/
function Youtube_API() {
    // Login variables
    this.logged_in = false;
    this.credentials = {};
    this.Auth = ''; //GoogleLogin auth=
    this.login = Youtube_API_login;
    
    // Standard feeds
    this.standard_feeds = [
        ['Top Rated', 'https://gdata.youtube.com/feeds/api/standardfeeds/top_rated'],
        ['Top Favorites', 'https://gdata.youtube.com/feeds/api/standardfeeds/top_favorites'],
        ['Most Viewed', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_viewed'],
        ['Most Shared', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_shared'], // Experimental feature
        ['Most Popular', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_popular'],
        ['Most Recent', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_recent'],
        ['Most Discussed', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_discussed'],
        ['Most Responded', 'https://gdata.youtube.com/feeds/api/standardfeeds/most_responded'],
        ['Recently Featured', 'https://gdata.youtube.com/feeds/api/standardfeeds/recently_featured'],
        ['Trending videos', 'https://gdata.youtube.com/feeds/api/standardfeeds/on_the_web'] // Experimental feature
    ];
    
    // Channel feeds
    /*this.channel_feeds = [
        ['Most viewed', 'https://gdata.youtube.com/feeds/api/channelstandardfeeds/most_viewed'],
        ['Most subscribed', 'https://gdata.youtube.com/feeds/api/channelstandardfeeds/most_subscribed']
    ]*/
    
    // Live events feeds - Experimental feature
    /*this.live_events_feeds = [
        ['Featured live events', 'https://gdata.youtube.com/feeds/api/charts/live/events/featured'],
        ['Current live events', 'https://gdata.youtube.com/feeds/api/charts/live/events/live_now'],
        ['Upcoming live events', 'https://gdata.youtube.com/feeds/api/charts/live/events/upcoming'],
        ['Recently broadcast', 'https://gdata.youtube.com/feeds/api/charts/live/events/recently_broadcast']
    ];*/
    
    // Movie feeds
    this.movie_feeds = [
        ['Most Popular Movies', 'https://gdata.youtube.com/feeds/api/charts/movies/most_popular'],
        ['Most Recent Movies', 'https://gdata.youtube.com/feeds/api/charts/movies/most_recent'],
        ['Most Recent', 'https://gdata.youtube.com/feeds/api/charts/movies/trending']
    ];
    
    // Trailer feeds
    this.trailer_feeds = [
        ['Most Popular', 'https://gdata.youtube.com/feeds/api/charts/trailers/most_popular'],
        ['Most Recent', 'https://gdata.youtube.com/feeds/api/charts/trailers/most_recent']
    ];
    
    // User feeds
    this.user_feeds = [
        ['My Favorites', 'http://gdata.youtube.com/feeds/api/users/default/favorites'],
        //['My Contact', 'https://gdata.youtube.com/feeds/api/users/default/contacts'],
        ['My Playlists', 'https://gdata.youtube.com/feeds/api/users/default/playlists'],
        ['My New Subscriptions', 'http://gdata.youtube.com/feeds/api/users/facanferpsn/newsubscriptionvideos'],
        ['My Subscriptions', 'https://gdata.youtube.com/feeds/api/users/default/subscriptions'],
        ['My Uploads', 'https://gdata.youtube.com/feeds/api/users/default/uploads'],
        ['Recommendations', 'https://gdata.youtube.com/feeds/api/users/default/recommendations']
    ];
    
    this.args_common = {
        'alt' : 'json',
        'max-results' : service.maxresults
    }
    
    // Headers for HTTP requests
    this.headers_common = {
        'GData-Version' : '2',
        'X-GData-Key' : 'key=AI39si7gfa8PEGC6qMb5Kk04aPInFlZVRIPZio6fNE9-0uwS4Qvo9dbhGxzeWIEQ8J4hMHGMtw2xOHuDGn3ped2EktTAVqCU9w' //Don't steal API key
    }
}

/*
 * Login user to Youtube
 * Returns:
 *  0 : Success 
 *  -1 : Fail
 */
function Youtube_API_login() {
    if(this.credentials.username)      
        return 0;
        
    var reason = "Login to Youtube account";    
    var do_query = false;    
    while(1) {      
        var credentials = plugin.getAuthCredentials("Youtube - Video sharing service",	
            reason, do_query);          
            
        if(!credentials) {	
            if(!do_query) {	  
                do_query = true;	  
                continue;	
            }	
            return -1;      
        }      
        if(credentials.rejected)	
            return -1; 
        try {
            var v = showtime.httpPost("https://www.google.com/accounts/ClientLogin", {	
                'Email' : credentials.username,	
                'Passwd' : credentials.password
            }, {
                'service' : 'youtube',
                'source' : 'showtime'
            }, this.headers_common);
        }
        catch(err) {
            showtime.trace(err + "\nLogin failed!");
            return -1;
        }
        
        var doc = v.toString();  
        if(doc.indexOf('Error=') != -1) {	
            reason = 'Error: ' + doc.slice(6);	
            continue;      
        }
        doc = doc.split('\n');
        this.Auth = 'GoogleLogin auth=' + doc[2].replace('Auth=','')
        showtime.trace('Logged in to Youtube as user: ' + credentials.username);
        this.headers_common.Authorization = this.Auth
        this.logged_in = true;
        return 0;    
    }
}
  
plugin.addURI(PREFIX+":start", startPage);
})(this);

var Inject = (function (){
	// constants ----------------------------------------------------------------
	var ID = {
		CONTAINER		: 'bluz-container',
		IFRAME_PREFIX	: 'bluz-iframe-',
        IFRAME_DETAILS  : 'bluz-iframe-details',
        IFRAME_PLUGIN  : 'bluz-iframe-bluz'
	};

	// variables ----------------------------------------------------------------
	var _this		= {},
		_views		= {},
		_container	= null;

	// initialize ---------------------------------------------------------------
	_this.init = function (){
        // listen to the Control Center (background.js) messages
        chrome.extension.onMessage.addListener(background_onMessage);

        // create the main container
        _container = document.createElement("div");
        _container.setAttribute("id", ID.CONTAINER);
        _container.setAttribute("data-active", 0);
        _container.style.borderBottom = "1px solid #222";
        _container.style.display = "none";

        document.body.appendChild(_container);


        // add the "bluz" iframes
        getView('bluz', _container);

        // listen to the iframes/webpages message
        window.addEventListener("message", dom_onMessage, false);
    };


	// private functions --------------------------------------------------------
	function getView (id) {
        var idFrame = ID.IFRAME_PREFIX+id;
        // return the view if it's already created
        if (_views[id]) return _views[id];

        // iframe initial details
        var src		= chrome.extension.getURL('html/iframe/'+id+'.html?view='+id+'&_'+(new Date().getTime())),
            iframe = document.createElement("iframe");

        iframe.setAttribute("id", idFrame);
        iframe.setAttribute("src", src);
        iframe.setAttribute('scrolling', false);
        iframe.style.width = "100%";
        iframe.style.height = "31px"; //(ID.IFRAME_DETAILS) ? '220px' : '31px';
        iframe.style.border = "0 none";
        iframe.style.display = (idFrame == ID.IFRAME_DETAILS) ? 'none' : 'block';

        // view
        _views[id] = {
            isLoaded	: false,
            iframe		: iframe
        };

        // add to the container
        _container.appendChild(iframe);

        return _views[id];
	}


    function tell (message, data){
        data = data || {};

        // send a message to "background.js"
        chrome.extension.sendRequest({
            message : message,
            data	: data
        });
    }

    function processMessage (request){
//        if (!request.message) return;

        switch (request.message){
            case 'iframe-loaded': message_onIframeLoaded(request.data); break;
            case 'open-plugin': message_onOpenPlugin(request.data); break;
            case 'open-details': message_onOpenDetails(request.data); break;
            case 'details-activate': message_onDetailsActivate(request.data); break;
            case 'details-close': message_onDetailsClose(request.data); break;
            case 'plugin-close': message_onPluginClose(); break;
            case 'cookie-add': message_onCookieAdd(request.data); break;
            case 'cookie-remove': message_onCookieRemove(request.data); break;
        }
    }


    // events -------------------------------------------------------------------
    // messages coming from iframes and the current webpage
    function dom_onMessage (event){
        if (!event.data.message) return;

        // tell another iframe a message
        if (event.data.view) {
            tell(event.data);
        } else {
            processMessage(event.data);
        }
    }

    // messages coming from "background.js"
    function background_onMessage (request, sender, sendResponse){
        if (request.data.view) return;
        processMessage(request);
    }

    function addParamsToConsole(params){ //console.log(params);
        for (var val in params){
            console.group(val);
            var param = JSON.parse(params[val]);
            for ( var i in param) {
                console.log(i, param[i]);
            }
            console.groupEnd();
        }
    }

    function setPosition(data){
        if (typeof data.position == 'undefined' || data.position == 'top') {
            _container.style.top = "0";
        } else {
            _container.style.bottom = "0";
        }
    }

	// messages -----------------------------------------------------------------
    function message_onIframeLoaded (data){
        var view 		= getView(data.source),
            allLoaded	= true;

        view.isLoaded = true;

        for (var i in _views){
            if (_views[i].isLoaded === false) allLoaded = false;
        }

        // tell "background.js" that all the frames are loaded
        if (allLoaded) {
            tell('all-iframes-loaded');
        }
    }

    function message_onOpenPlugin(data) {
        if (data.cookie.debug.active) {
            if (data.source == 'bluz') { // frames: 'bluz', 'details'
                addParamsToConsole(data.barParams);
            }

            _container.removeAttribute('style');
            setPosition(data);
            _container.style.borderBottom = "1px solid #222";
            _container.style.display = 'block';

            document.getElementById(ID.IFRAME_PLUGIN).style.display = 'block';
            tell('popup-debug-active');
        }
    }

    function message_onOpenDetails(data) { //console.log(data);
        if (data.source == 'bluz') {
            addParamsToConsole(data.barParams);
        }
    }

    function message_onDetailsActivate(data) {
        tell('details-activate1');
    }

    function message_onCookieAdd(data) {
        tell('cookie-add', {"cookie": data.cookie});
    }

    function message_onCookieRemove(data){
        tell('cookie-remove', {"cookie": data.cookie});
    }

    function message_onDetailsClose(data) {
        document.getElementById(ID.IFRAME_DETAILS).style.display = 'none';
    }

    function message_onPluginClose(data) {
        _container.style.display = 'none';
    }

	return _this;
}());

document.addEventListener("DOMContentLoaded", function (){
    Inject.init();
}, false);


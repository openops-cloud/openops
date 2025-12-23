/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.ts":
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", ({ value: true }));
    exports.jwtTokenQueryParamName = exports.ActivepiecesVendorEventName = exports.ActivepiecesClientEventName = void 0;
    var ActivepiecesClientEventName;
    (function (ActivepiecesClientEventName) {
        ActivepiecesClientEventName["CLIENT_INIT"] = "CLIENT_INIT";
        ActivepiecesClientEventName["CLIENT_ROUTE_CHANGED"] = "CLIENT_ROUTE_CHANGED";
    })(ActivepiecesClientEventName || (exports.ActivepiecesClientEventName = ActivepiecesClientEventName = {}));
    var ActivepiecesVendorEventName;
    (function (ActivepiecesVendorEventName) {
        ActivepiecesVendorEventName["VENDOR_INIT"] = "VENDOR_INIT";
        ActivepiecesVendorEventName["VENDOR_ROUTE_CHANGED"] = "VENDOR_ROUTE_CHANGED";
    })(ActivepiecesVendorEventName || (exports.ActivepiecesVendorEventName = ActivepiecesVendorEventName = {}));
    exports.jwtTokenQueryParamName = "jwtToken";
    class ActivepiecesEmbedded {
        constructor() {
            this._prefix = '';
            this._initialRoute = '';
            this._hideSidebar = false;
            this._disableNavigationInBuilder = true;
            this.iframeParentOrigin = window.location.origin;
            this.parentOrigin = window.location.origin;
        }
        configure({ prefix, initialRoute, hideSidebar, disableNavigationInBuilder }) {
            this._prefix = prefix || '/';
            this._initialRoute = initialRoute || '/';
            this._hideSidebar = hideSidebar || false;
            this._disableNavigationInBuilder = disableNavigationInBuilder === undefined ? true : disableNavigationInBuilder;
            setIframeChecker(this);
        }
    }
    const setIframeChecker = (client) => {
        const iframeChecker = setInterval(() => {
            const iframe = document.querySelector('iframe');
            const iframeWindow = iframe === null || iframe === void 0 ? void 0 : iframe.contentWindow;
            if (!iframeWindow)
                return;
            window.addEventListener('message', function (event) {
                if (event.source === iframeWindow) {
                    switch (event.data.type) {
                        case ActivepiecesClientEventName.CLIENT_INIT: {
                            const apEvent = {
                                type: ActivepiecesVendorEventName.VENDOR_INIT,
                                data: {
                                    prefix: client._prefix,
                                    initialRoute: client._initialRoute,
                                    hideSidebar: client._hideSidebar,
                                    disableNavigationInBuilder: client._disableNavigationInBuilder,
                                },
                            };
                            iframeWindow.postMessage(apEvent, '*');
                            break;
                        }
                    }
                }
            });
            checkForVendorRouteChanges(iframeWindow, client);
            checkForClientRouteChanges(client);
            clearInterval(iframeChecker);
        });
    };
    const checkForClientRouteChanges = (client) => {
        window.addEventListener('message', function (event) {
            if (event.data.type === ActivepiecesClientEventName.CLIENT_ROUTE_CHANGED) {
                const prefixStartsWithSlash = client._prefix.startsWith('/') ? client._prefix : `/${client._prefix}`;
                const routeWithPrefix = prefixStartsWithSlash + event.data.data.route;
                if (!client.handleClientNavigation) {
                    this.history.replaceState({}, '', routeWithPrefix);
                }
                else {
                    client.handleClientNavigation({ route: routeWithPrefix });
                }
            }
        });
    };
    const checkForVendorRouteChanges = (iframeWindow, client) => {
        let currentRoute = window.location.href;
        setInterval(() => {
            if (currentRoute !== window.location.href) {
                currentRoute = window.location.href;
                if (client.handleVendorNavigation) {
                    client.handleVendorNavigation({ route: currentRoute });
                }
                const prefixStartsWithSlash = client._prefix.startsWith('/');
                const apEvent = {
                    type: ActivepiecesVendorEventName.VENDOR_ROUTE_CHANGED,
                    data: {
                        vendorRoute: extractRouteAfterPrefix(currentRoute, prefixStartsWithSlash
                            ? client.parentOrigin + client._prefix
                            : `${client.parentOrigin}/${client._prefix}`),
                    },
                };
                iframeWindow.postMessage(apEvent, '*');
            }
        }, 50);
    };
    function extractRouteAfterPrefix(href, prefix) {
        return href.split(prefix)[1];
    }
    window.activepieces = new ActivepiecesEmbedded();
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=bundled.js.map
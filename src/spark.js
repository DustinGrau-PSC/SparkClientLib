/**
 * Singleton object for accessing common features,
 * specifically in the JSDO library from Progress.
 */
(function($, progress, window){
    if ($ && progress && typeof window.spark === "undefined") {

        var jsdoUsername = null;
        var jsdoPassword = null;
        var jsdoSession = null; // Private handle to current JSDO session.
        var optionDefaults = {id: "", filterQuery: "", data: {}, success: false, error: false};

        window.spark = {

            /** Reserved Properties **/

            field: {},  // For field transformations.
            form: {},   // For form/validation helpers.
            grid: {},   // For grid transformations.
            loader: {}, // External file loader methods.
            nav: {},    // App routing and navigation.
            notify: {}, // Notifications and messages.

            /** Special Handler Functions **/

            jsdoFailure: function(jsdo, success, request){
                if (request.xhr && request.xhr.status === 401 || request.xhr.status === 403) {
                    // Check if an authentication error occurred during request.
                    if (window.spark.jsdoAuthError) {
                        window.spark.jsdoAuthError(request);
                    } else {
                        alert("Session has expired. Please login again.");
                    }
                } else if (request.response && request.response._errors && request.response._errors.length > 0) {
                    // Interrogate the response and log any errors.
                    var errorMsg = "";
                    var lenErrors = request.response._errors.length;
                    for (var idxError = 0; idxError < lenErrors; idxError++) {
                        var errorEntry = request.response._errors[idxError];
                        errorMsg = errorMsg + " " + errorEntry._errorMsg;
                    }
                    if ($.trim(errorMsg) !== "") {
                        console.warn(errorMsg);
                    }
                }
            },

            /** Initialization Functions **/

            createSession: function(serviceURI, catalogURI, authModel){
            	if (!jsdoSession) {
                    jsdoSession = new progress.data.JSDOSession({
                        // anonymous = progress.data.Session.AUTH_TYPE_ANON
                        // basic-* = progress.data.Session.AUTH_TYPE_BASIC
                        // form-* = progress.data.Session.AUTH_TYPE_FORM
                        authenticationModel: authModel || progress.data.Session.AUTH_TYPE_ANON,
                        serviceURI: serviceURI || null
                    });
                }

                if (jsdoSession.loginResult !== progress.data.Session.LOGIN_SUCCESS) {
                	// Obtain cached credentials, or provide defaults for anonymous use.
                	var username = jsdoUsername || "anonymous";
                	var password = jsdoPassword || "";
                	return jsdoSession.login(username, password)
                        .then(function(){
                        	// Load the catalogs as part of the session creation process.
                        	return window.spark.loadCatalogs(catalogURI);
                        }, function(){
                            return "Unable to reach the REST adapter to establish a session.";
                        });
                } else {
                    var promise = $.Deferred();
                    promise.resolve("loggedIn");
                    return promise;
                }
            },

            loadCatalogs: function(catalogURI){
            	// Add a property to track the catalogs to be loaded.
                jsdoSession.catalogLoaded = {};
                if (typeof catalogURI == "string") {
                	jsdoSession.catalogLoaded[catalogURI] = false;
                } else if (catalogURI instanceof Array) {
                	$.each(catalogURI, function(i, catalog){
                		jsdoSession.catalogLoaded[catalog] = false;
                	});
                }
				// Load one (string) or more (array) catalogs to this session.
            	var username = jsdoUsername || "anonymous";
            	var password = jsdoPassword || "";
                return jsdoSession.addCatalog(catalogURI, username, password)
                    .then(function(session, result, responses){
                        // Denote when a catalog has been loaded.
                        $.each(responses, function(i, response){
                        	jsdoSession.catalogLoaded[response.catalogURI] = (response.result ? true : false);
                        });
                        return responses;
                    }, function(session, result, responses){
                    	console.log("Response:", responses);
                    	return "Failed to load catalog(s).";
                    });
            },

            createJSDO: function(resourceName){
                // First check if a JSDO exists in the session, otherwise create.
                var jsdo = null;
                $.each(jsdoSession.JSDOs, function(i, j){
                    if (j.name === resourceName) {
                        jsdo = j;
                        return;
                    }
                });
                return (jsdo || (new progress.data.JSDO({name: resourceName})));
            },

            setCredentials: function(username, password){
                jsdoUsername = username || null;
                jsdoPassword = password || null;
            },

            /** Utility Functions **/

            clone: function(originalProps, newProps){
                return $.extend(true, {}, originalProps, newProps);
            },

            toProperCase: function(string){
                return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
            },

            getJsdoSession: function(){
                return jsdoSession;
            },

            getMergedOptions: function(options){
                return this.clone(optionDefaults, options);
            },

            getQueryStringValue: function(key){
                // Extract a specific value from the URL parameters.
                var urlParams = window.location.search;
                if (urlParams === "") {
                    urlParams = window.location.href;
                }
                return unescape(urlParams.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
            },

            /**  JSDO methods for CRUD operation **/

            createJSDODataSource: function(resourceName, options){
                var jsdo = window.spark.createJSDO(resourceName);

                // Determine capabilities for READ operation.
                var jsdoProps = jsdo.getMethodProperties("read");
                var capabilities = [];
                if (jsdoProps && jsdoProps.capabilities) {
                    capabilities = jsdoProps.capabilities.split(",");
                }

                // Setup the default options for the datasource.
                var defaults = {
                    serverFiltering: capabilities.indexOf("filter") > -1,
                    serverPaging: capabilities.indexOf("top") > -1,
                    serverSorting: capabilities.indexOf("sort") > -1,
                    transport: {
                        jsdo: jsdo
                    },
                    type: "jsdo"
                };

                // Provide special overrides for inner objects.
                if (options.tableRef) {
                    defaults.transport.tableRef = options.tableRef;
                    delete options.tableRef;
                }

                return new kendo.data.DataSource($.extend(defaults, options));
            },

            // Read - Wrapper method to fetch a dataset.
            jsdo_read: function(jsdoObj, options){
                var promise = null;
                var filterQuery = options.filterQuery || "";
                if (filterQuery === "") {
                    promise = jsdoObj.fill();
                } else {
                    promise = jsdoObj.fill(filterQuery);
                }
                promise
                    .done(function(jsdo, success, request){
                        // Provide overrides or logic when request is successful.
                    })
                    .fail(this.jsdoFailure);
                return promise;
            },

            // Create - Wrapper method to create a record.
            jsdo_create: function(jsdoObj, options){
                var currentRecord = options.data;
                var jsrecord = jsdoObj.add(currentRecord);
                var promise = jsdoObj.saveChanges();
                promise
                    .done(function(jsdo, success, request){
                        // Provide overrides or logic when request is successful.
                    })
                    .fail(this.jsdoFailure);
                return promise;
            },

            // Update - Wrapper method to update a record.
            jsdo_update: function(jsdoObj, options, callback){
                var jsrecord = jsdoObj.findById(options.id);
                try {
                    jsrecord.assign(options.data);
                } catch(e){
                    options.error(null, null, e);
                }
                var promise = jsdoObj.saveChanges();
                promise
                    .done(function(jsdo, success, request){
                        // Provide overrides or logic when request is successful.
                    })
                    .fail(this.jsdoFailure);
                return promise;
            },

            // Delete - Wrapper method to delete a record.
            jsdo_delete: function(jsdoObj, options, callback){
                var jsrecord = jsdoObj.findById(options.id);
                try {
                    jsrecord.remove();
                } catch(e){
                    options.error(null, null, e);
                }
                var promise = jsdoObj.saveChanges();
                promise
                    .done(function(jsdo, success, request){
                        // Provide overrides or logic when request is successful.
                    })
                    .fail(this.jsdoFailure);
                return promise;
            }

        }; // window.spark

    }
})(jQuery, progress, window);

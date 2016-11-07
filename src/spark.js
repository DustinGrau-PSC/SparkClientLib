/**
 * @file Singleton object for accessing common features, specifically in the [JSDO client library]{@link https://documentation.progress.com/output/pdo/index.html#page/pdo%2Fjsdo-class-and-object-reference.html%23}.
 * @author Progress Services
 * @copyright Progress Software 2015-2016
 * @license Apache-2.0
 */
(function($, progress, window){
    "use strict";

    if ($ && progress && typeof window.spark === "undefined") {

        var jsdoUsername = null;
        var jsdoPassword = null;
        var jsdoSession = null; // Private handle to current JSDO session.
        var optionDefaults = {id: "", filterQuery: "", data: {}, success: false, error: false};

        /**
         * Primary client-side object for PMFO.
         * @namespace spark
         * @type {object}
         */
        window.spark = {

            /** Reserved Properties **/

            field: {},  // For field transformations.
            form: {},   // For form/validation helpers.
            grid: {},   // For grid transformations.
            loader: {}, // External file loader methods.
            nav: {},    // App routing and navigation.
            notify: {}, // Notifications and messages.

            /** Special Handler Functions **/

        	/**
			 * Standard callback method for handling JSDO errors.
			 * @method jsdoError
			 * @memberof spark
        	 * @param {object} ev Event object
        	 * @returns {boolean}
        	 */
            jsdoError: function(ev){
            	// Utilizes methods in JSDO release v4.2+
				var jsdo = ((ev.xhr || {}).jsdo || {getErrors: function(){return [];}});				
				var errorArray = jsdo.getErrors();
				var errors = []; // List of errors to report.
				$.each(errorArray, function(i, error){
					switch(error.type){
						case -1: // Error
	                        var errObj = null;
	                        if (error.responseText) {
		                        try {
		                            errObj = JSON.parse(error.responseText || "");
		                        }
		                        catch(e) {
		                        	console.log("Error while parsing response: " + error.responseText || "N/A");
		                        }
	                        }
							if (errObj && typeof(errObj) === "object") {
								$.each(errObj, function(dsName, ds){
									if (ds["prods:errors"]) {
										$.each(ds["prods:errors"], function(ttName, tt){
											$.each(tt, function(j, ttErr){
												errors.push(ttErr["prods:error"]);
											});
										});
									}
								});
							} else {
								errors.push(error.error);
							}
							break;
						case -2: // App Error
							errors.push(error.error + " (" + error.errorNum + ")");
							break;
						case -3: // Return Value
							errors.push(error.error);
							break;
						case -4: // Data Error
							errors.push(error.error);
							break;
						default:
							console.log("Unknown error:", error);
					}
				});

				// Make a final attempt to gather any errors thrown.
				if (errors.length === 0 && ev.errorThrown !== "") {
					errors.push(ev.errorThrown);
				}

				// Output all bundled errors to user.
				if (errors.length > 0) {
					console.warn("Errors: ", errors);
					if (app.showMessage) {
						app.showMessage(errors, "error");
					} else {
						alert(errors[0]);
					}
				}
				ev.preventDefault();
				return false;
            },

        	/**
			 * Reserved callback method for handling JSDO errors.
			 * @method jsdoFailure
			 * @memberof spark
        	 * @param {object} jsdo Instance of the JavaScript Data Object
        	 * @param {boolean} success State of the response (pass/fail)
        	 * @param {object} request Original request object, which contains the response
        	 * @returns void
        	 */
            jsdoFailure: function(jsdo, success, request){
            	// Custom handler for individual CRUD operation wrappers.
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
                    var idxError = null;
                    var lenErrors = request.response._errors.length;
                    var errorEntry = "";
                    for (idxError=0; idxError<lenErrors; idxError+=1) {
                        errorEntry = request.response._errors[idxError] || {};
                        errorMsg = errorMsg + " " + errorEntry._errorMsg || "UNKNOWN";
                    }
                    if ($.trim(errorMsg) !== "") {
                        console.warn(errorMsg);
                    }
                }
            },

            /** Initialization Functions **/

        	/**
        	 * Critical startup method for establishing a [JSDO session]{@link https://documentation.progress.com/output/pdo/index.html#page/pdo%2Fprogress.data.jsdosession-class.html%23}, which also authenticates
        	 * the user and obtains any necessary Data Object Service Catalog(s).
			 * @method spark.createSession
			 * @memberof spark
        	 * @param {string} serviceURI Root directory for all services
        	 * @param {(string|string[])} catalogURI Catalog URI as string or array of strings
        	 * @param {string} authModel Authentication model (default: anonymous)
        	 * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
        	 */
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

        	/**
        	 * Internal method to obtain Data Object Service Catalog(s).
        	 * Traditionally called by createSession() automatically.
			 * @method loadCatalogs
			 * @memberof spark
			 * @private
        	 * @param {(string|string[])} catalogURI Catalog URI as string or array of strings
        	 * @returns {mixed} Status or array of statuses
        	 */
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

        	/**
        	 * Create a JSDO instance, or attempt to utilize an existing instance from session memory.
			 * @method createJSDO
			 * @memberof spark
        	 * @param {string} resourceName Name of unique resource to create as JSDO instance
        	 * @returns {object} [JSDO instance object]{@link https://documentation.progress.com/output/pdo/index.html#page/pdo/progress.data.jsdo-class.html}
        	 */
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

        	/**
        	 * Store user credentials in local variables for session use.
			 * @method setCredentials
			 * @memberof spark
        	 * @param {string} username Username
        	 * @param {string} password Password
        	 * @returns void
        	 */
            setCredentials: function(username, password){
                jsdoUsername = username || null;
                jsdoPassword = password || null;
            },

            /** Utility Functions **/

        	/**
        	 * Helper method to clone an object.
			 * @method clone
			 * @memberof spark
        	 * @param {object} originalProps Original object with properties
        	 * @param {object} newProps New object with mergeable properties
        	 * @returns {object} Cloned object
        	 */
            clone: function(originalProps, newProps){
                return $.extend(true, {}, originalProps, newProps);
            },

        	/**
        	 * Convert a string to proper case.
			 * @method toProperCase
			 * @memberof spark
        	 * @param {string} string Original string to be converted
        	 * @returns {string}
        	 */
            toProperCase: function(string){
                return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
            },

        	/**
        	 * Obtain the JSDO Session object.
			 * @method getJsdoSession
			 * @memberof spark
        	 * @returns {object} JSDO Session object
        	 */
            getJsdoSession: function(){
                return jsdoSession;
            },

        	/**
        	 * Obtain default options for custom CRUD operations.
			 * @method getMergedOptions
			 * @memberof spark
        	 * @param {object} options Additional object to merge to options
        	 * @returns {object} Merged options
        	 */
            getMergedOptions: function(options){
                return this.clone(optionDefaults, options);
            },

        	/**
        	 * Obtain value from query string by named parameter.
			 * @method getQueryStringValue
			 * @memberof spark
        	 * @param {string} key Specific query property to be returned
        	 * @returns {string} Found property
        	 */
            getQueryStringValue: function(key){
                // Extract a specific value from the URL parameters.
                var urlParams = window.location.search;
                if (urlParams === "") {
                    urlParams = window.location.href;
                }
                return unescape(urlParams.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
            },

            /**  JSDO methods for CRUD operation **/

        	/**
        	 * Create a new Kendo DataSource driven by a JSDO instance.
			 * @method createJSDODataSource
			 * @memberof spark
        	 * @param {string} resourceName Name of unique resource to create as JSDO instance
        	 * @param {object} options Properties for this DataSource
        	 * @returns {object} Kendo DataSource instance
        	 */
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

        	/**
        	 * Wrapper method to fetch a dataset.
			 * @method jsdo_read
			 * @memberof spark
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
        	 */
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
                    .fail(window.spark.jsdoFailure);
                return promise;
            },

        	/**
        	 * Wrapper method to create a record.
			 * @method jsdo_create
			 * @memberof spark
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
        	 */
            jsdo_create: function(jsdoObj, options){
                var currentRecord = options.data;
                var jsrecord = jsdoObj.add(currentRecord);
                var promise = jsdoObj.saveChanges();
                promise
                    .done(function(jsdo, success, request){
                        // Provide overrides or logic when request is successful.
                    })
                    .fail(window.spark.jsdoFailure);
                return promise;
            },

        	/**
        	 * Wrapper method to update a record.
			 * @method jsdo_update
			 * @memberof spark
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
        	 */
            jsdo_update: function(jsdoObj, options){
				var jsrecord = {};
				if (options.tableRef && jsdoObj[options.tableRef]) {
					// If a specific table is given, look for record there.
					jsrecord = jsdoObj[options.tableRef].findById(options.id);
				} else {
					// Otherwise use the "global" method for this JSDO.
					jsrecord = jsdoObj.findById(options.id);
				}
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
                    .fail(window.spark.jsdoFailure);
                return promise;
            },

        	/**
        	 * Wrapper method to delete a record.
			 * @method jsdo_delete
			 * @memberof spark
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
        	 */
            jsdo_delete: function(jsdoObj, options){
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
                    .fail(window.spark.jsdoFailure);
                return promise;
            }

        }; // window.spark

    }
})(jQuery, progress, window);

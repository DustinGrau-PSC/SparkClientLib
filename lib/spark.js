/**
 * Singleton object for accessing common features,
 * specifically in the JSDO library from Progress.
 */
(function($, progress, window){
    "use strict";

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

        	/**
			 * Standard callback method for handling JSDO errors.
			 * @name spark.jsdoError
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
			 * @name spark.jsdoFailure
        	 * @param {object} jsdo Instance of the JavaScript Data Object
        	 * @param {boolean} success State of the response (pass/fail)
        	 * @param {object} request Original request object, which contains the response
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
        	 * Critical startup method for establishing a JSDO session, which also authenticates
        	 * the user and obtains any necessary Data Object Service Catalog(s).
			 * @name spark.createSession
        	 * @param {string} serviceURI Root directory for all services
        	 * @param {mixed} catalogURI Catalog URI as string or array of strings
        	 * @param {string} authModel Authentication model (default: anonymous)
        	 * @returns {promise} Promise object instance
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
			 * @name spark.loadCatalogs
			 * @private
        	 * @param {mixed} catalogURI Catalog URI as string or array of strings
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
			 * @name spark.createJSDO
        	 * @param {string} resourceName Name of unique resource to create as JSDO instance
        	 * @returns {object} JSDO instance object
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
			 * @name spark.setCredentials
        	 * @param {string} username Username
        	 * @param {string} password Password
        	 */
            setCredentials: function(username, password){
                jsdoUsername = username || null;
                jsdoPassword = password || null;
            },

            /** Utility Functions **/

        	/**
        	 * Helper method to clone an object.
			 * @name spark.clone
        	 * @param {object} originalProps Original object with properties
        	 * @param {object} newProps New object with mergeable properties
        	 * @returns {object} Cloned object
        	 */
            clone: function(originalProps, newProps){
                return $.extend(true, {}, originalProps, newProps);
            },

        	/**
        	 * Convert a string to proper case.
			 * @name spark.toProperCase
        	 * @param {string} string Original string to be converted
        	 * @returns {string}
        	 */
            toProperCase: function(string){
                return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
            },

        	/**
        	 * Obtain the JSDO Session object.
			 * @name spark.getJsdoSession
        	 * @returns {object} JSDO Session object
        	 */
            getJsdoSession: function(){
                return jsdoSession;
            },

        	/**
        	 * Obtain default options for custom CRUD operations.
			 * @name spark.getMergedOptions
        	 * @param {object} options Additional object to merge to options
        	 * @returns {object} Merged options
        	 */
            getMergedOptions: function(options){
                return this.clone(optionDefaults, options);
            },

        	/**
        	 * Obtain value from query string by named parameter.
			 * @name spark.getQueryStringValue
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
			 * @name spark.createJSDODataSource
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
			 * @name spark.jsdo_read
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {promise} Promise object instance
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
			 * @name spark.jsdo_create
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {promise} Promise object instance
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
			 * @name spark.jsdo_update
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {promise} Promise object instance
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
			 * @name spark.jsdo_delete
        	 * @param {object} jsdoObj Instance of the JavaScript Data Object
        	 * @param {object} options Standard options to send through this JSDO
        	 * @returns {promise} Promise object instance
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
// Singleton object for common utilities.
(function($, window){
    "use strict";

    if ($ && typeof window.spark !== "undefined") {

        window.spark = $.extend(window.spark, {

        	/**
        	 * Clear data in the browser's local storage (if available).
        	 * @param {string} key - Name of the property to clear.
        	 */
            clearPersistentObject: function(key){
                var storage = window.localStorage || null;
                if (storage && storage.clearObject) {
                    storage.clearObject(key);
                    return true;
                } else if (storage) {
                    delete storage[key];
                    return true;
                } else {
                    // Fall back to using cookies.
                    window.spark.setCookie(key, "");
                    return true;
                }
            },

        	/**
        	 * Set data in the browser's local storage (if available).
        	 * @param {string} key - Name of the property to set.
        	 * @param {string} value - String value to be stored.
        	 */
            setPersistentObject: function(key, value){
                var storage = window.localStorage || null;
                if (storage && storage.getObject) {
                    storage.setObject(key, value);
                    return true;
                } else if (storage) {
                    storage[key] = JSON.stringify(value);
                    return true;
                } else {
                    // Fall back to using cookies.
                    window.spark.setCookie(key, JSON.stringify(value));
                    return true;
                }
            },

        	/**
        	 * Get data in the browser's local storage (if available).
        	 * @param {string} key - Name of the property to get.
        	 */
            getPersistentObject: function(key){
                var storage = window.localStorage || null;
                if (storage && storage.getObject) {
                    return storage.getObject(key);
                } else if (storage) {
                    var storageValue = storage[key];
                    if (typeof(storageValue) === "string") {
                        // Only strings should be stored.
                        return JSON.parse(storageValue);
                    }
                } else {
                    // Fall back to using cookies.
                    var cookieValue = window.spark.getCookie(key);
                    if (typeof(cookieValue) === "string") {
                        // Only strings should be stored.
                        return JSON.parse(cookieValue);
                    }
                }
                return "";
            },

        	/**
        	 * Clear data in the browser's session storage (if available).
        	 * @param {string} key - Name of the property to clear.
        	 */
            clearSessionObject: function(key){
                var storage = window.sessionStorage || null;
                if (storage && storage.clearObject) {
                    storage.clearObject(key);
                    return true;
                } else if (storage) {
                    delete storage[key];
                    return true;
                }
                return false;
            },

        	/**
        	 * Set data in the browser's session storage (if available).
        	 * @param {string} key - Name of the property to set.
        	 * @param {string} value - String value to be stored.
        	 */
            setSessionObject: function(key, value){
                var storage = window.sessionStorage || null;
                if (storage && storage.getObject) {
                    storage.setObject(key, value);
                    return true;
                } else if (storage) {
                    storage[key] = JSON.stringify(value);
                    return true;
                }
                return false;
            },

        	/**
        	 * Get data in the browser's session storage (if available).
        	 * @param {string} key - Name of the property to get.
        	 */
            getSessionObject: function(key){
                var storage = window.sessionStorage || null;
                if (storage && storage.getObject) {
                    return storage.getObject(key);
                } else if (storage) {
                    var value = storage[key];
                    if (typeof(storage[key]) === "string") {
                        // Only strings should be stored.
                        return JSON.parse(value);
                    }
                }
                return "";
            },

        	/**
        	 * Get data via a standard browser cookie.
        	 * @param {string} key - Name of the cookie to get.
        	 */
            getCookie: function(key){
                var name = key + "=";
                var i = null;
                var ca = document.cookie.split(";");
                var c = "";
                for(i=0; i<ca.length; i+=1) {
                    c = ca[i];
                    while (c.charAt(0) == " ") {
                        c = c.substring(1);
                    }
                    if (c.indexOf(name) == 0) {
                        return c.substring(name.length, c.length);
                    }
                }
                return "";
            },

        	/**
        	 * Set data via a standard browser cookie.
        	 * @param {string} key - Name of the cookie to set.
        	 * @param {string} value - Value of the set cookie.
        	 * @param {integers} exdays - Days to live for cookie.
        	 */
            setCookie: function(key, value, exdays){
                var d = new Date();
                d.setTime(d.getTime() + ((exdays || 1) * 24 * 60 * 60 * 1000));
                var expires = "expires=" + d.toUTCString();
                document.cookie = key + "=" + value + "; " + expires + "; path=/";
            },

        	/**
        	 * Returns today's date without a date component.
        	 */
            getToday: function(){
            	var today = new Date();
            	return (new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
            },

        	/**
        	 * Get a date by adding/subtracting days from today.
        	 * @param {integer} numDays - Number of days to subtract/add.
        	 */
            getDateByDays: function(numDays){
                if (typeof(numDays) == "number" && numDays != 0) {
                    var today = new Date();
                    var timestamp = today.setDate(today.getDate() + numDays);
                    return (new Date(timestamp));
                }
                return (new Date());
            },

        	/**
        	 * Get a date by adding/subtracting weeks from this week.
        	 * @param {integer} numWeeks - Number of weeks to subtract/add.
        	 */
            getDateByWeeks: function(numWeeks){
                if (typeof(numWeeks) == "number" && numWeeks != 0) {
                    var today = new Date();
                    var timestamp = this.getDateByDays(-1 * today.getDay());
                    timestamp = today.setDate(timestamp.getDate() + (7 * numWeeks));
                    return (new Date(timestamp));
                }
                return (new Date());
            },

        	/**
        	 * Get a date by adding/subtracting weeks from this week.
        	 * @param {string} selector - JQuery selector for locating template.
        	 * @param {object} data - JSON object to be applied to template.
        	 */
            getTemplate: function(selector, data){
            	if ($(selector).length) {
            		// Load a template (as selector) and apply data (if present).
	            	var templateObject = kendo.template($(selector).html());
					if (data) {
	            		return templateObject(data);
	            	}
	            	return templateObject;
            	}
            	return null;
            }

        }); // window.spark
    }

    /**
     * Prepare custom methods to extend functionality of DOM storage.
     * These are designed to allow storing non-string objects, after
     * appropriate conversion through the browser's JSON object.
     */
    if (window.Storage) {
        /**
         * Add methods to the object prototype, for all storage types.
         * Only applies when Storage object is supported by browser.
         */

    	/**
    	 * Enhance prototype for clearing object.
    	 */
        Storage.prototype.clearObject = function(key){
            if (this.removeItem) {
                this.removeItem(key);
            }
        };

    	/**
    	 * Enhance prototype for retrieving object.
    	 */
        Storage.prototype.getObject = function(key){
            if (this.getItem) {
                // Automatically parse back to JSON format.
                return JSON.parse(this.getItem(key));
            }
            return ""; // Return empty when method unavailable.
        };

    	/**
    	 * Enhance prototype for storing object.
    	 */
        Storage.prototype.setObject = function(key, value){
            if (this.setItem) {
                try{
                    // Automatically stringify complex JSON values.
                    var jsonValue = JSON.stringify(value);
                    this.setItem(key, jsonValue);
                }
                catch(err){
                    console.warn("Unable to store peristent object in DOM: " + err);
                    console.warn("An error was encountered while storing data to the browser. Please view the ISC logs for details.");
                }
            }
        };
    }

})(jQuery, window);
// Create an object with external file loader methods.
if (window.spark && jQuery && kendo) {

    window.spark.loader = (function($, kendo){
        return {
            // Loads an external screen (JS + HTML) from path into the DOM.
            loadExtScreen: function(rootPath, contentID, pageName, options){
                // Use jQuery Ajax to fetch the JS model file.
                return $.ajax({
                    dataType: "script",
                    url: rootPath + ".js",
                    success: function(jsResult){
                        // Use jQuery Ajax to fetch the HTML view file.
                        return $.ajax({
                            dataType: "html",
                            url: rootPath + ".html",
                            success: function(htmlResult){
                                // On success, add contents to DOM where specified.
                                kendo.destroy($("#" + contentID).children());
                                $("#" + contentID).empty();
                                $("#" + contentID).html(htmlResult);
                            },
                            error: function(result){
                                alert("Error loading HTML file " + rootPath + ".html");
                            }
                        });
                    },
                    error: function(result){
                        alert("Error loading JavaScript file " + rootPath + ".js");
                    }
                });
            },

            // Loads an external HTML modal from a specific location into the DOM.
            loadExtInclude: function(filePath, contentID, modalName, options){
                // Use jQuery Ajax to fetch the modal content.
                return $.ajax({
                    dataType: "html",
                    url: filePath,
                    success: function(htmlResult){
                        // On success, add contents to DOM where specified.
                        kendo.destroy($("#" + contentID).children());
                        $("#" + contentID).empty();
                        $("#" + contentID).html(htmlResult);
                        $("[data-toggle=tooltip]").tooltip();
                    },
                    error: function(result){
                        alert("Error loading template file " + filePath);
                    }
                });
            },

            // Loads an external Kendo template from a specific location into the DOM.
            loadExtTemplate: function(filePath, contentID, templateID, options){
                // Use jQuery Ajax to fetch the template script.
                return $.ajax({
                    dataType: "html",
                    url: filePath,
                    success: function(tmplResult){
                        // On success, add contents to DOM where specified.
                        $("#" + contentID).append(tmplResult);
                        var template = kendo.template($("#" + templateID).html());
                        var htmlBody = template(options || {});
                        kendo.destroy($("#" + contentID).children());
                        $("#" + contentID).empty();
                        $("#" + contentID).html(htmlBody);
                    },
                    error: function(result){
                        alert("Error loading template file " + filePath);
                    }
                });
            }
        };
    })(jQuery, kendo);

}
// Singleton object for common field transformations.
if (window.spark && jQuery && kendo) {

    window.spark.field = {

        lookupTextField: "name",
        lookupValueField: "value",
        USStateList: [
            "AL", "AK", "AS", "AZ", "AR",
            "CA", "CO", "CT",
            "DE", "DC",
            "FM", "FL",
            "GA", "GU",
            "HI",
            "ID", "IL",
            "IN", "IA",
            "KS", "KY",
            "LA",
            "ME", "MH", "MD", "MA", "MI", "MN", "MS", "MO", "MP", "MT",
            "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
            "OH", "OK", "OR",
            "PW", "PA", "PR",
            "RI",
            "SC", "SD",
            "TN", "TX",
            "UT",
            "VT", "VI", "VA",
            "WA", "WV", "WI", "WY"
        ],

        createDatePicker: function(selector, fieldOptions){
            // Create a culture-based date picker that understands common input formats.
            if ($(selector).length) {
            	var patterns = ((kendo.cultures.current || {}).calendar || {}).patterns || {};
            	var primary = patterns.d || "MM/dd/yyyy";
            	return $(selector).kendoDatePicker($.extend({
                    format: primary,
                    parseFormats: [primary, "MM/dd/yyyy", "MM/dd/yy", "yyyy-MM-dd"]
                }, fieldOptions)).getKendoDatePicker();
            }
            return null;
        },

        createDatePickerMDY: function(selector, fieldOptions){
            // Create a standard MDY date picker that understands common input formats.
            if ($(selector).length) {
                return $(selector).kendoDatePicker($.extend({
                    format: "MM/dd/yyyy",
                    parseFormats: ["MM/dd/yyyy", "MM/dd/yy", "yyyy-MM-dd"]
                }, fieldOptions)).getKendoDatePicker();
            }
            return null;
        },

        createFormattedPhone: function(selector, fieldOptions){
            // Create a standard text input for phone format.
            if ($(selector).length) {
                return $(selector).kendoMaskedTextBox($.extend({
                    mask: "(000) 000-0000"
                }, fieldOptions)).getKendoMaskedTextBox();
            }
            return null;
        },

        createFormattedSSN: function(selector, fieldOptions){
            // Create a standard text input for SSN format.
            if ($(selector).length) {
                return $(selector).kendoMaskedTextBox($.extend({
                    mask: "000-00-0000"
                }, fieldOptions)).getKendoMaskedTextBox();
            }
            return null;
        },

        createMultiLookup: function(selector, fieldOptions){
            // Create a standard dropdown for multiple lookup values.
            if ($(selector).length) {
                return $(selector).kendoMultiSelect($.extend({
                    autoClose: false,
                    dataSource: new kendo.data.DataSource(), // Standard datasource.
                    dataTextField: this.lookupTextField,
                    dataValueField: this.lookupValueField,
                    suggest: true,
                    valuePrimitive: true // Allows initial value to be nullable.
                }, fieldOptions)).getKendoMultiSelect();
            }
            return null;
        },

        createSimpleLookup: function(selector, fieldOptions){
            // Create a simple dropdown for a single lookup value.
            if ($(selector).length) {
            	if (fieldOptions.multiple === true) {
                    return $(selector).kendoMultiSelect($.extend({
                    	autoClose: false,
                    	dataSource: [],
                    	suggest: true,
                        valuePrimitive: true // Allows initial value to be nullable.
                    }, fieldOptions)).getKendoMultiSelect();
            	} else {
                    return $(selector).kendoDropDownList($.extend({
                        dataSource: [],
                        suggest: true,
                        valuePrimitive: true // Allows initial value to be nullable.
                    }, fieldOptions)).getKendoDropDownList();            		
            	}
            }
            return null;
        },

        createSingleLookup: function(selector, fieldOptions){
            // Create a name/value dropdown for a single lookup value.
            if ($(selector).length) {
                return $(selector).kendoDropDownList($.extend({
                    dataSource: new kendo.data.DataSource(), // Standard datasource.
                    dataTextField: this.lookupTextField,
                    dataValueField: this.lookupValueField,
                    suggest: true,
                    valuePrimitive: true // Allows initial value to be nullable.
                }, fieldOptions)).getKendoDropDownList();
            }
            return null;
        },

        createUSStateList: function(selector, fieldOptions){
            // Create a common dropdown for US state/province selection.
            if ($(selector).length) {
                return $(selector).kendoDropDownList($.extend({
                    dataSource: this.USStateList,
                    optionLabel: "Select",
                    valuePrimitive: true // Allows initial value to be nullable.
                }, fieldOptions)).getKendoDropDownList();
            }
            return null;
        },

        createInvokeLookup: function(selector, fieldOptions){
        	if ($(selector).length) {
        		// First create as a single-item-selection lookup.
        		var lookup = null;
        		if (fieldOptions.multiple === true) {
            		lookup = $(selector).kendoMultiSelect($.extend({
            			autoClose: false,
            			dataSource: new kendo.data.DataSource(), // Standard datasource.
                        filter: "contains",
                        suggest: true,
                        valuePrimitive: true // Allows initial value to be nullable.                    
                    }, fieldOptions)).getKendoMultiSelect();       
        		} else {
            		lookup = $(selector).kendoDropDownList($.extend({
                        dataSource: new kendo.data.DataSource(), // Standard datasource.
                        filter: "contains",
                        valuePrimitive: true // Allows initial value to be nullable.                    
                    }, fieldOptions)).getKendoDropDownList();        			
        		}

            	if (!fieldOptions.invokeResource) {
            		console.log("Resource name was not specified for invoke lookup:", selector);
            		return lookup;
            	}

        		// Perform initial load of data from invoke method.
        		if (lookup && fieldOptions.invokeResource) {
        			lookup._jsdo = spark.createJSDO(fieldOptions.invokeResource);
	                if (fieldOptions.invokeMethod) {
	                	// Create a method that can be called at-will to update data.
	                	lookup.fetchData = function(params){
	                		lookup._jsdo.invoke(fieldOptions.invokeMethod, (params || {}))
			                	.done(function(jsdo, status, request){
			                		var response = request.response || {};
			                		if (fieldOptions.invokeDataProperty) {
			                			// Data should be found within a specific response property.
				                		var data = response[fieldOptions.invokeDataProperty] || [];
				                		lookup.dataSource.data(data);
			                		} else {
			                			// Otherwise use the entire response as-is.
			                			lookup.dataSource.data(response);
			                		}
			                	});
	                    };
	                    if (fieldOptions.autoBind == undefined || fieldOptions.autoBind === true) {
	                    	// Perform initial fetch only if autoBind is not present,
	                    	// or if option is present and explicitly set to true.
	                    	lookup.fetchData();
	                    }
	                } else {
	                	lookup.fetchData = function(params){
	                		console.log("Method is not currently configured for use.");
	                	};
	                	console.log("No method name provided for invoke lookup:", selector);
	                }
        		}
                return lookup;
            }
            return null;
        },

        createResourceLookup: function(selector, fieldOptions){
        	if (!fieldOptions.resourceName) {
        		console.log("Resource name was not specified for resource lookup:", selector);
        		return null;
        	}

        	if ($(selector).length) {
        		var dsOptions = {
    				transport: {
                        jsdo: spark.createJSDO(fieldOptions.resourceName)
                    },
                    type: "jsdo"
        		};
        		delete fieldOptions.resourceName;

                var jsdoProps = dsOptions.transport.jsdo.getMethodProperties("read");
                if (jsdoProps && jsdoProps.capabilities) {
                	dsOptions.serverFiltering = (jsdoProps.capabilities || "").indexOf("filter") > -1;
	                dsOptions.serverPaging = (jsdoProps.capabilities || "").indexOf("top") > -1;
	                dsOptions.serverSorting = (jsdoProps.capabilities || "").indexOf("sort") > -1;
                }
        		if (fieldOptions.resourceTable) {
        			dsOptions.transport.tableRef = fieldOptions.resourceTable;
        			delete fieldOptions.resourceTable;
        		}
        		if (fieldOptions.dataValueField) {
        			dsOptions.sort = {field: fieldOptions.dataValueField, dir: "asc"};
        		}

        		return $(selector).kendoDropDownList($.extend({
        			dataSource: new kendo.data.DataSource(dsOptions),
                    filter: "contains",
                    suggest: true,
                    valuePrimitive: true // Allows initial value to be nullable.
                }, fieldOptions)).getKendoDropDownList();
            }
            return null;
        },

        createResourceAutoComplete: function(selector, fieldOptions){
        	if (!fieldOptions.resourceName) {
        		console.log("Resource name was not specified for resource auto-complete:", selector);
        		return null;
        	}

        	if ($(selector).length) {
        		var dsOptions = {
    				transport: {
                        jsdo: spark.createJSDO(fieldOptions.resourceName)
                    },
                    type: "jsdo"
        		};
        		delete fieldOptions.resourceName;

                var jsdoProps = dsOptions.transport.jsdo.getMethodProperties("read");
                if (jsdoProps && jsdoProps.capabilities) {
                	dsOptions.serverFiltering = (jsdoProps.capabilities || "").indexOf("filter") > -1;
	                dsOptions.serverPaging = (jsdoProps.capabilities || "").indexOf("top") > -1;
	                dsOptions.serverSorting = (jsdoProps.capabilities || "").indexOf("sort") > -1;
                }
        		if (fieldOptions.resourceTable) {
        			dsOptions.transport.tableRef = fieldOptions.resourceTable;
        			delete fieldOptions.resourceTable;
        		}
        		if (fieldOptions.dataValueField) {
        			dsOptions.sort = {field: fieldOptions.dataValueField, dir: "asc"};
        		}
        		if (fieldOptions.dataSourceOptions) {
        			dsOptions = $.extend(dsOptions, fieldOptions.dataSourceOptions);
        			delete fieldOptions.dataSourceOptions;
        		}

        		return $(selector).kendoAutoComplete($.extend({
        			dataSource: new kendo.data.DataSource(dsOptions),
                    filter: "startsWith",
                    minLength: 2,
                    virtual: true,
                    change: function(e) {
                    	/**
                    	 * Reset the filter after each change of data.
                    	 * Necessary due to filters apparently stacking
                    	 * up as you change the search value.
                    	 */
                    	e.sender.dataSource.filter({});
                    },
                    filtering: function(e){
                    	/**
                    	 * Adjust the filter before sending, allowing for the
                    	 * ability to search on an alternate field--one that
                    	 * is not the same field to be used as the dataTextField. 
                    	 */
                    	var filter = e.filter;
                    	if (fieldOptions.filterField) {
                    		filter.field = fieldOptions.filterField;
                    	}
        				return filter;
                    }
                }, fieldOptions)).getKendoAutoComplete();
            }
            return null;
        },

        addKeypressEvent: function(selector, fieldOptions){
        	var _timeout = null;
        	if ($(selector).length) {
        		if (!fieldOptions.onInvalidKey) {
        			fieldOptions.onInvalidKey = function(ev){
        				if (ev) {
        					ev.preventDefault();
        				}
        				return false; // Ignore any uncaught keys.
        			}
        		}
        		$(selector).keypress(function(ev){
                	if (ev.which !== 0) {
                		var value = String.fromCharCode(ev.which);
                		if (ev.which === kendo.keys.BACKSPACE) {
        					// Allow Backspace as a valid key.
        					clearTimeout(_timeout);
                			_timeout = setTimeout(fieldOptions.onValidKey, fieldOptions.delay || 400);
        				} else if (ev.which === kendo.keys.ENTER) {
        					// Perform action on Enter keypress.
                			clearTimeout(_timeout);
                			_timeout = setTimeout(fieldOptions.onEnter, fieldOptions.delay || 400);
        				} else if (value.match(fieldOptions.filter || /.*/)) {
        					// Filter only certain keys, disallowing all other keys.
        					// Default pattern should match any key not already caught.
                			clearTimeout(_timeout);
                			_timeout = setTimeout(fieldOptions.onValidKey, fieldOptions.delay || 400);
                		} else {
                			return fieldOptions.onInvalidKey.apply(this, [ev]);
                		}
                    }
                });
        		$(selector).keyup(function(ev){
        			if (ev.which === kendo.keys.DELETE) {
        				// Can only capture the Delete key with "keyup" event.
        				clearTimeout(_timeout);
            			_timeout = setTimeout(fieldOptions.onValidKey, fieldOptions.delay || 400);
        			}
        		});
        		return true;
        	}
        	return false;
        }

    };

}
// Singleton object for common form operations.
if (window.spark && kendo) {

    window.spark.form = {

        doOnEnter: function(selector, callback, target){
            if ($(selector).length) {
                $(selector)
                    .on("keypress", function(ev){
                        var keyCode = (ev.keyCode ? ev.keyCode : ev.which);
                        if (keyCode === 13) {
                            if (callback && typeof callback === "function") {
                                setTimeout(function(){
                                    callback.apply(target || this, [ev]);
                                }, 20);
                            }
                        }
                    });
            }
        },

        doOnSubmit: function(selector, callback, target){
            if ($(selector).length) {
                $(selector)
                    .on("submit", function(ev){
                        ev.preventDefault();
                        if (callback && typeof callback === "function") {
                            callback.apply(target || this, [ev]);
                        }
                    });
            }
        },

        getValidator: function(selector, options){
            // Create a validator object for the given selector.
            if ($(selector).length) {
                if ($(selector).getKendoValidator() && !options) {
                    // Return the selector's validator if it exists and no options present.
                    return $(selector).getKendoValidator();
                }
                // Otherwise create a new validator (with options) on the given selector.
                return $(selector).kendoValidator($.extend({}, options)).getKendoValidator();
            }
            return null;
        },

        validate: function(selector, options){
            // Validate the given selector via validator instance.
            var validator = this.getValidator(selector, options);
            if (validator && validator.validate) {
                // Return the result of the validate method.
                return validator.validate();
            }
            return false;
        }

    };

}
// Singleton object for common grid operations.
if (window.spark && kendo) {

    window.spark.grid = {

        getSelectedRecord: function(event){
            // Using the given event, obtain the current record.
            var grid = event.sender;
            if (grid) {
                return grid.dataItem(grid.select());
            }
            return {};
        },

        getViewState: function(grid) {
            return {
                columns: grid.columns,
                sort: grid.dataSource.sort(),
                filter: grid.dataSource.filter(),
                group: grid.dataSource.group()
            };
        },

        createReadOnlyEditor: function(){
        	/**
        	 * Lazy-initializer for creating an "editor" that
        	 * merely displays the value, and makes the column
        	 * non-editable by not providing a input field.
        	 */
        	return function(container, options){
        		container.text(options.model[options.field]);
        	}
        },

        createMultiLookup: function(fieldOptions){
        	/**
        	 * Lazy-initializer for creating an editor that
        	 * utilizes a multi-select dropdown list.
        	 */
        	return function(container, options){
				options.sparkEditor = spark.field.createMultiLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
				setTimeout(function(){
					/**
					 * Convert comma-delimited data into an array, and assign as
					 * values of the new multi-select field. For some reason we
					 * need to do this with a small delay after widget creation.
					 */
					var data = options.model[options.field] || options.model.defaults[options.field];
					if (typeof(data) === "string" && data.indexOf(",") > -1) {
						data = data.split(",");
					}
					options.sparkEditor.value(data);
				}, 20);
        	}
        },

        createSimpleLookupEditor: function(fieldOptions){
        	/**
        	 * Lazy-initializer for creating an editor that
        	 * utilizes a simple array or object as options.
        	 */
        	return function(container, options){
        		options.sparkEditor = spark.field.createSimpleLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        		setTimeout(function(){
        			var data = options.model[options.field] || options.model.defaults[options.field];
        			options.sparkEditor.value(data);
				}, 20);
        	}
        },

        createSingleLookupEditor: function(fieldOptions){
        	/**
        	 * Lazy-initializer for creating an editor that
        	 * utilizes a name/value pairing as options.
        	 */
        	return function(container, options){
                options.sparkEditor = spark.field.createSingleLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        		setTimeout(function(){
        			var data = options.model[options.field] || options.model.defaults[options.field];
					options.sparkEditor.value(data);
				}, 20);
        	}
        },

        createInvokeLookupEditor: function(fieldOptions){
        	/**
        	 * Lazy-initializer for creating an editor that
        	 * utilizes an invoke method to populate options.
        	 */
        	return function(container, options){
                options.sparkEditor = spark.field.createInvokeLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        	}
        }

    };

}
// Singleton object for common file IO transformations.
if (window.spark && jQuery && kendo) {

    window.spark.io = {

        addExtensionClass: function(extension){
            switch(extension){
                case ".jpg":
                case ".img":
                case ".png":
                case ".gif":
                    return "fa fa-file-image-o fa-3x";
                case ".doc":
                case ".docx":
                    return "fa fa-file-word-o fa-3x";
                case ".xls":
                case ".xlsx":
                    return "fa fa-file-excel-o fa-3x";
                case ".pdf":
                    return "fa fa-file-pdf-o fa-3x";
                case ".zip":
                case ".rar":
                    return "fa fa-file-zip-o fa-3x";
                default:
                    return "fa fa-file-o fa-3x";
            }
        },

        createUpload: function(selector, uploadOptions, overrides){
            // Create a standard file upload widget.
            if ($(selector)) {
                return $(selector).kendoUpload($.extend({
                    async: {
                        // autoUpload: when true, uploads begin as soon as files are dropped/chosen.
                        autoUpload: uploadOptions.autoUpload || false,

                        // batch: when multiple files are selected or dropped TOGETHER, sent as single POST.
                        batch: uploadOptions.batchUpload || false,

                        // relative path to this page: http://[server]:[port]/upload.
                        saveUrl: uploadOptions.saveURL || "upload",

                        // saveField: sets the Content-Disposition "name" attribute to "group" the upload.
                        saveField: uploadOptions.saveField || "files"
                    },

                    // Basic operations (enable selection button, multi-file upload).
                    enabled: uploadOptions.enableUpload || false,
                    multiple: uploadOptions.multiUpload || false,

                    // Enables the display of the listing of [to-be] uploaded files.
                    showFileList: uploadOptions.showFileList || false,

                    // Template used to render the file list
                    template: uploadOptions.template || null,

                    // These events are fired only in async mode.
                    cancel: uploadOptions.onCancel || null,     // Fires when the upload has been cancelled while in progress.
                    complete: uploadOptions.onComplete || null, // Fires when all active uploads completed either successfully or with errors.
                    error: uploadOptions.onError || null,       // Fires when an upload/remove operation has failed.
                    progress: uploadOptions.onProgress || null, // Fires when upload progress data is available [not fired in IE <10].
                    success: uploadOptions.onSuccess || null,   // Fires when an upload/remove operation has been completed successfully.
                    upload: uploadOptions.onUpload || null,     // Fires when files are about to be uploaded; canceling will prevent the upload.

                    // Sync and async events.
                    select: uploadOptions.onSelect || null, // Triggered when a file is selected; canceling will prevent selection from occurring.
                    remove: uploadOptions.onRemove || null  // Fires when uploaded file is about to be removed; canceling will prevent the remove.
                }, overrides)).getKendoUpload();
            }
            return null;
        }

    };

}
// Create an object for application navigation.
if (window.spark && kendo) {

    window.spark.nav = (function(kendo){
        return {
            /**
             * Create a simplistic path-based router for site navigation.
             * Options is an object with the following properties:
             *   - filePathPrefix: Relative location of physical files.
             *   - mainContentID: ID for loading content dynamically.
             *   - getLandingPage: Obtain name of landing page file.
             *   - onChange: Event callback on each change of route.
             *   - onLoad: Event callback after loading extra files.
             *
             * @param options Object
             * @returns kendo.Router
             */
            createSimpleRouter: function(options){
                // Options property must be an object.
                if (!options) { options = {}; }

                // Make sure property is set with a default ID.
                if (!options.mainContentID || options.mainContentID === "") {
                    options.mainContentID = "mainContent";
                }

                // Define a new router with specific paths.
                var router = new kendo.Router({
                    change: options.onChange || function(ev){}
                });

                // Define a simple routing patterns for this application.
                router.route("/", function(){
                    /**
                     * Returning to the index page may require the loading of a specific
                     * landing page. Therefore we must assume a callback will be required
                     * and so a promise will be used to track the result. This allows
                     * the getLandingPage method to be asynchronous as well.
                     */
                    var promise = jQuery.Deferred();
                    if (options.getLandingPage) {
                        // Replace local promise with returned promise.
                        promise = options.getLandingPage();
                    } else {
                        // Immediately resolve the local promise.
                        promise.resolve("");
                    }

                    // Setup for successful response from promise.
                    promise.done(function(page){
                        if (page !== "") {
                            // Load the model/view files and initialize page.
                            var path = options.filePathPrefix + page;
                            spark.loader.loadExtScreen(path, options.mainContentID, page)
                                .complete(function(){
                                    if (options.onLoad) {
                                        options.onLoad(page, path);
                                    }
                                });
                        } else {
                            // Just initialize the landing page as-is.
                            if (options.onLoad) {
                                options.onLoad("");
                            }
                        }
                    });
                });
                router.route("/logout", function(){
                    // Perform a logout and redirect to login page.
                    spark.getJsdoSession().logout()
                        .then(function(){
                            if (options.onLogout) {
                                options.onLogout(); // Perform post-logout action.
                            }
                        });
                });
                router.route("/:page", function(page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path);
                            }
                        });
                });
                router.route("/:sec/:page", function(sec, page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + sec + "/" + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path, sec);
                            }
                        });
                });
                router.route("/:sec/:sub/:page", function(sec, sub, page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + sec + "/" + sub + "/" + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path, sec, sub);
                            }
                        });
                });

                return router;
            },

            /**
             * Create a collapsible, vertically-stacked menu.
             * Data should be in the following format:
             * 	[{
             *    "text": "", // Parent Item Title
             *    "icon": "", // FA Icon Class
             *    "items": [{
             *      "text": "", // Child Item Title
             *      "url": "", // Child Item URL
             *    }]
             *  }]
             *  
             * @param selector Target DOM element as jQuery selector
             * @param menuData Array of menu objects (parents + children)
             * @returns void
             */
            createVerticalStackMenu: function(selector, menuData){
                if ($(selector)) {
                    // Destroy any previous contents.
                    $(selector).empty();

        			// Cycle through menu data, building structure.
        			var navItem = $('<nav class="nav-primary hidden-xs" data-ride="collapse" role="navigation"></nav>');
        			var navList = $('<ul class="nav" data-ride="collapse"></ul>');
                    if (typeof(menuData) === "object") {
        				$.each(menuData, function(i, parent){
        	            	var currentPath = ""; // Identifies the current link in use.
        	            	if (app.currentPage.path && app.currentPage.path != "") {
        	                	currentPath = "#" + app.currentPage.path.replace("app/views", "");
        	                }

        	            	// Construct the parent menu item.
        					var navParentLink = $('<a href="javascript:void(0)" class="auto nav-link"></a>');
        					if (parent.icon) {
        						navParentLink.append($('<i class="fa ' + parent.icon + ' m-r-xs"></i>'));
        					}

        					// Add parent link to new parent menu item.
        					var navParent = $('<li class="nav-item"></li>');
        					navParentLink.append($('<span>' + parent.text + '</span>'));
        					navParent.append(navParentLink);

        					// Build all child menu items.
        					var navChildList = $('<ul class="nav dker"></ul>');
        					if (typeof(parent.items) === "object") {
        						$.each(parent.items, function(j, child){
        							// Create the menu link for this child.
        							var navChildLink = $('<a class="nav-link"></a>');
        							navChildLink.attr("href", child.url);
        							if (child.url.indexOf("http") === 0) {
        								navChildLink.attr("target", "_blank");
        							}

        							// Create new child menu item and append link.
        							var navChild = $('<li class="nav-item"></li>');
        							navChild.append(navChildLink.text(child.text));
        							navChildList.append(navChild);

        							// Mark parent and child as active when needed.
        							if (currentPath != "" && currentPath == child.url) {
        								navParent.addClass("active");
        								navChildLink.addClass("active");
        							}
        						});
        					}

        					// Add children to parent menu, add to navigation.
        					navParent.append(navChildList);
        					navList.append(navParent);
        				});
                    }
                    navItem.append(navList);
        			$(selector).append(navItem);
                } else {
                    console.info("No menu element has been defined.");
                }
            }
        };
    })(kendo);

}
// Create an object for displaying on-screen messages.
if (window.spark && jQuery && kendo) {

    window.spark.notify = (function($, kendo){
        return {
            setNotificationArea: function(selector, options){
                var notificationObj = null; // Notification object instance.
                if ($(selector).length) {
                    // Create a new notification widget.
                    notificationObj = $(selector).kendoNotification($.extend({
                        appendTo: selector, // Element that anchors all messages.
                        autoHideAfter: 30000, // Hide the message after 30 seconds.
                        button: true // Display dismissal button in message area.
                    }, options)).getKendoNotification();

                    // Add a method to display a message and scroll into view.
                    notificationObj.showNotification = function(message, type){
                    	var self = this;
                    	if (self) {
                            // Type is "info" (default), "success", "warning", or "error".
                    		if (typeof(message) === "string") {
                    			// Single message as string.
                    			self.show(message || "", type || "info");
                    		} else if (Array.isArray(message)) {
                    			$.each(message, function(i, msg){
                    				// Message is an array of strings.
                    				self.show(msg || "", type || "info");
                    			});
                    		}
                            if (this.options.appendTo) {
	                            var container = $(self.options.appendTo);
	                            if (container.length) {
	                                container.scrollTop(container[0].scrollHeight);
	                            }
                            }
                        }
                    };
                }
                return notificationObj;
            }
        };
    })(jQuery, kendo);

}

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
                    return jsdoSession.login(jsdoUsername || "anonymous", jsdoPassword || "")
                        .then(function(){
                            jsdoSession.catalogLoaded = {};
                            jsdoSession.catalogLoaded[catalogURI] = false;
                            return jsdoSession.addCatalog(catalogURI, jsdoUsername || "anonymous", jsdoPassword || "")
                                .then(function(session, result, responses){
                                    // Denote when a catalog has been loaded.
                                    $.each(responses, function(i, response){
                                        jsdoSession.catalogLoaded[response.catalogURI] = (response.result ? true : false);
                                    });
                                    return responses;
                                });
                        }, function(){
                            return "Unable to reach the REST adapter to establish a session.";
                        });
                } else {
                    var promise = $.Deferred();
                    promise.resolve("loggedIn");
                    return promise;
                }
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
                var jsdo = spark.createJSDO(resourceName);

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
// Singleton object for common utilities.
(function($, window){

    if ($ && typeof window.spark !== "undefined") {

        window.spark = $.extend(window.spark, {

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
                    this.setCookie(key, "");
                    return true;
                }
            },

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
                    this.setCookie(key, JSON.stringify(value));
                    return true;
                }
            },

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
                    var cookieValue = this.getCookie(key);
                    if (typeof(cookieValue) === "string") {
                        // Only strings should be stored.
                        return JSON.parse(cookieValue);
                    }
                }
                return "";
            },

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

            getCookie: function(key){
                var name = key + "=";
                var ca = document.cookie.split(";");
                for(var i=0; i<ca.length; i++) {
                    var c = ca[i];
                    while (c.charAt(0) == " ") c = c.substring(1);
                    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
                }
                return "";
            },

            setCookie: function(key, value, exdays){
                var d = new Date();
                d.setTime(d.getTime() + ((exdays || 1) * 24 * 60 * 60 * 1000));
                var expires = "expires=" + d.toUTCString();
                document.cookie = key + "=" + value + "; " + expires + "; path=/";
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

        Storage.prototype.clearObject = function(key, value){
            if (this.removeItem) {
                this.removeItem(key);
            }
        };

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

        Storage.prototype.getObject = function(key){
            if (this.getItem) {
                // Automatically parse back to JSON format.
                return JSON.parse(this.getItem(key));
            }
            return ""; // Return empty when method unavailable.
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

        createDatePickerMDY: function(selector, options){
            // Create a standard MDY date picker that understands common input formats.
            if ($(selector)) {
                return $(selector).kendoDatePicker($.extend({
                    format: "MM/dd/yyyy",
                    parseFormats: ["MM/dd/yyyy", "MM/dd/yy", "yyyy-MM-dd"]
                }, options)).getKendoDatePicker();
            }
            return null;
        },

        createFormattedPhone: function(selector, options){
            // Create a standard text input for phone format.
            if ($(selector)) {
                return $(selector).kendoMaskedTextBox($.extend({
                    mask: "(000) 000-0000"
                }, options)).getKendoMaskedTextBox();
            }
            return null;
        },

        createFormattedSSN: function(selector, options){
            // Create a standard text input for SSN format.
            if ($(selector)) {
                return $(selector).kendoMaskedTextBox($.extend({
                    mask: "000-00-0000"
                }, options)).getKendoMaskedTextBox();
            }
            return null;
        },

        createMultiLookup: function(selector, options){
            // Create a standard dropdown for multiple lookup values.
            if ($(selector).length) {
                return $(selector).kendoMultiSelect($.extend({
                    autoClose: false,
                    dataSource: new kendo.data.DataSource(),
                    dataTextField: this.lookupTextField,
                    dataValueField: this.lookupValueField,
                    valuePrimitive: true // Allows initial value to be nullable.
                }, options)).getKendoMultiSelect();
            }
            return null;
        },

        createSingleLookup: function(selector, options){
            // Create a standard dropdown for a single lookup value.
            if ($(selector).length) {
                return $(selector).kendoDropDownList($.extend({
                    dataSource: new kendo.data.DataSource(),
                    dataTextField: this.lookupTextField,
                    dataValueField: this.lookupValueField,
                    valuePrimitive: true // Allows initial value to be nullable.
                }, options)).getKendoDropDownList();
            }
            return null;
        },

        createUSStateList: function(selector, options){
            // Create a common dropdown for US state/province selection.
            if ($(selector).length) {
                return $(selector).kendoDropDownList($.extend({
                    dataSource: this.USStateList,
                     optionLabel: "Select",
                     valuePrimitive: true // Allows initial value to be nullable.
                }, options)).getKendoDropDownList();
            }
            return null;
        }

    };

}
// Singleton object for common form operations.
if (window.spark && kendo) {

    window.spark.form = {

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
            if (validator) {
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
        },

    };

}
// Create an object for application navigation.
if (window.spark && kendo) {

    window.spark.nav = (function(kendo){
        return {
            /** Create a simplistic path-based router for site navigation.
             *  Options is an object with the following properties:
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
            }
        };
    })(kendo);

}
// Create an object for displaying on-screen messages.
if (window.spark && jQuery && kendo) {

    window.spark.notify = (function($, kendo){
        var _notificationObj = null; // Last notification object instance.

        return {
            setNotificationArea: function(selector, options){
                selector = selector || "#staticNotification";
                if ($(selector).length) {
                    _notificationObj = $(selector).kendoNotification($.extend({
                        appendTo: "#notificationArea", // Element that gets new messages.
                        autoHideAfter: 20000, // Hide the message after 20 seconds.
                        button: true // Display dismissal button in message area.
                    }, options)).getKendoNotification();
                } else {
                    _notificationObj = null; // Reset/clear last-known area.
                }
                return _notificationObj;
            },

            showStaticNotification: function(message, type){
                if (_notificationObj) {
                    _notificationObj.show(message, type || "info");
                    var container = $(_notificationObj.options.appendTo);
                    if (container.length) {
                        container.scrollTop(container[0].scrollHeight);
                    }
                }
            }
        };
    })(jQuery, kendo);

}

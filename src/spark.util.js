/**
 * @file Singleton object for common utilities.
 * @author Progress Services
 * @copyright Progress Software 2015-2016
 * @license Apache-2.0
 */
(function($, window){
    "use strict";

    if ($ && typeof window.spark !== "undefined") {

        window.spark = $.extend(window.spark, {

        	/**
        	 * Clear data in the browser's local storage (if available).
             * @method clearPersistentObject
             * @memberof spark
        	 * @param {string} key - Name of the property to clear.
             * @returns {boolean} Success of operation
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
                return false;
            },

        	/**
        	 * Set data in the browser's local storage (if available).
             * @method setPersistentObject
             * @memberof spark
        	 * @param {string} key - Name of the property to set.
        	 * @param {string} value - String value to be stored.
             * @returns {boolean} Success of operation
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
                return false;
            },

        	/**
        	 * Get data in the browser's local storage (if available).
             * @method getPersistentObject
             * @memberof spark
        	 * @param {string} key - Name of the property to get.
             * @returns {string} Value of persistent object (stringified)
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
             * @method clearSessionObject
             * @memberof spark
        	 * @param {string} key - Name of the property to clear.
             * @returns {boolean} Success of operation
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
             * @method setSessionObject
             * @memberof spark
        	 * @param {string} key - Name of the property to set.
        	 * @param {string} value - String value to be stored.
             * @returns {boolean} Success of operation
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
             * @method getSessionObject
             * @memberof spark
        	 * @param {string} key - Name of the property to get.
             * @returns {string} Value of session object (stringified)
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
             * @method getCookie
             * @memberof spark
        	 * @param {string} key - Name of the cookie to get.
             * @returns {string} Value of cookie (stringified)
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
             * @method setCookie
             * @memberof spark
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
             * @method getToday
             * @memberof spark
             * @returns {date} Today's date
        	 */
            getToday: function(){
            	var today = new Date();
            	return (new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
            },

        	/**
        	 * Get a date by adding/subtracting days from today.
             * @method getDateByDays
             * @memberof spark
        	 * @param {integer} numDays - Number of days to subtract/add.
             * @returns {date} New date before/after given days
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
             * @method getDateByWeeks
             * @memberof spark
        	 * @param {integer} numWeeks - Number of weeks to subtract/add.
             * @returns {date} New date before/after given weeks
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
             * @method getTemplate
             * @memberof spark
        	 * @param {string} selector - JQuery selector for locating template.
        	 * @param {object} data - JSON object to be applied to template.
             * @returns {object} Kendo template object instance
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

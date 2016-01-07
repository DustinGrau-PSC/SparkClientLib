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

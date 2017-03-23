/**
 * @file Singleton object for common form operations.
 * @author Progress Services
 * @copyright Progress Software 2015-2017
 * @license Apache-2.0
 */
if (window.spark && kendo) {

    /**
     * String operations for PMFO.
     * @namespace spark.strings
     * @memberof spark
     */
    window.spark.strings = {

        // Protected variable to track translated strings.
        _translatedStrings: {},

        // Protected variable to track translations requests.
        _translationRequests: [],

        // Track all translations requests.
        trackTranslations: false,

        /**
         * Add additional strings to the internal list of translated strings.
         * @method addTranslatedStrings
         * @memberof spark.strings
         * @param {object} newStrings New collection of translated strings to add to internal library
         * @returns void
         */
        addTranslatedStrings: function(newStrings){
            if (typeof newStrings === "object") {
                this._translatedStrings = $.extend(this._translatedStrings, newStrings);
            }
        },

        /**
         * Obtain a translated string from the internal library.
         * @method getTranslatedString
         * @memberof spark.strings
         * @param {object} newStrings New collection of translated strings to add to internal library
         * @returns {string} Translated string, if original text exists; otherwise returns original
         */
        getTranslatedString: function(originalText){
            // Potentially remember this translation.
            this.trackTranslation(originalText);

            if (this._translatedStrings && this._translatedStrings[originalText]) {
                // Return a string from internal library.
                return this._translatedStrings[originalText];
            }

            // Otherwise returns original text, as-is.
            return originalText;
        },

        /**
         * Track or return requests for translated strings.
         * @method trackTranslation
         * @memberof spark.strings
         * @param {string} translationRequest String requested for translation use
         * @returns {array} List of translated string requests
         */
        trackTranslation: function(translationRequest){
            if (this.trackTranslations) {
                // Proceed with tracking if variable has been set.
                if (translationRequest && translationRequest !== "" &&
                    this._translationRequests.indexOf(translationRequest) === -1) {
                    // Remember this unique string if not already tracked.
                    this._translationRequests.push(translationRequest);
                }
            }
            return this._translationRequests;
        }

    };

}

/**
 * @file Singleton object for common form operations.
 * @author Progress Services
 * @copyright Progress Software 2015-2016
 * @license Apache-2.0
 */
if (window.spark && kendo) {

    /**
     * Form operations for PMFO.
     * @namespace spark.form
     * @memberof spark
     */
    window.spark.form = {

        /**
         * Perform an action on Enter keypress.
         * @method doOnEnter
         * @memberof spark.form
         * @param {string} selector Target DOM element as [jQuery selector]{@link https://api.jquery.com/category/selectors/}
         * @param {function} callback Properties for widget
         * @param {object} target Target for keypress event
         * @returns void
         */
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

        /**
         * Perform an action on form Submit.
         * @method doOnSubmit
         * @memberof spark.form
         * @param {string} selector Target DOM element as [jQuery selector]{@link https://api.jquery.com/category/selectors/}
         * @param {function} callback Properties for widget
         * @param {object} target Target for keypress event
         * @returns void
         */
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

        /**
         * Returns (after createion, as necessary) a Kendo Validator object.
         * @method getValidator
         * @memberof spark.form
         * @param {string} selector Target DOM element as [jQuery selector]{@link https://api.jquery.com/category/selectors/}
         * @param {object} options Properties for widget
         * @returns {object} [kendo.ui.Validator]{@link http://docs.telerik.com/kendo-ui/api/javascript/ui/validator}
         */
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

        /**
         * Execute the [validate method]{@link http://docs.telerik.com/kendo-ui/api/javascript/ui/validator#methods-validate} on an existing Kendo Validator.
         * @method validate
         * @memberof spark.form
         * @param {string} selector Target DOM element as [jQuery selector]{@link https://api.jquery.com/category/selectors/}
         * @param {object} options Properties for widget
         * @returns {boolean} Result of validation
         */
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

// Singleton object for common form operations.
if (window.spark && kendo) {

    window.spark.form = {

        doOnEnter: function(selector, callback, target){
            if ($(selector).length) {
                $(selector)
                    .keypress(function(ev){
                        if (ev.which === 13) {
                            if (callback && typeof callback === "function") {
                                setTimeout(function(){
                                    callback.apply(target || this, [ev]);
                                }, 100);
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

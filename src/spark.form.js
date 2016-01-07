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

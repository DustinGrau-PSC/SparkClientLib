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

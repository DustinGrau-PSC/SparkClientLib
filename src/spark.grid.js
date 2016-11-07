/**
 * @file Singleton object for common grid operations.
 * @author Progress Services
 * @copyright Progress Software 2015-2016
 * @license Apache-2.0
 */
if (window.spark && kendo) {

    /**
     * Grid operations for PMFO.
     * @namespace spark.grid
     * @memberof spark
     */
    window.spark.grid = {

        /**
         * Helper method to obtain a selected grid record.
         * @method getSelectedRecord
         * @memberof spark.grid
         * @param {object} event Event object
         * @returns {object} Selected record
         */
        getSelectedRecord: function(event){
            // Using the given event, obtain the current record.
            var grid = event.sender;
            if (grid) {
                return grid.dataItem(grid.select());
            }
            return {};
        },

        /**
         * Returns a custom object with common grid state information.
         * @method getViewState
         * @memberof spark.grid
         * @param {object} grid Grid instance of [kendo.ui.Grid]{@link http://docs.telerik.com/kendo-ui/api/javascript/ui/grid}
         * @returns {object} Object with columns, sort, filter, and group properties
         */
        getViewState: function(grid) {
            return {
                columns: grid.columns,
                sort: grid.dataSource.sort(),
                filter: grid.dataSource.filter(),
                group: grid.dataSource.group()
            };
        },

        /**
         * Lazy-initializer for creating an "editor" that merely displays the value, and makes the column non-editable by not providing a input field.
         * @method createReadOnlyEditor
         * @memberof spark.grid
         * @returns {object} Simple text container with column value
         */
        createReadOnlyEditor: function(){
        	return function(container, options){
        		container.text(options.model[options.field]);
        	}
        },

        /**
         * Lazy-initializer for creating an editor that utilizes a multi-select dropdown list.
         * @method createMultiLookup
         * @memberof spark.grid
         * @param {object} fieldOptions Properties for widget
         * @returns {object} Instance of a {@link spark.field.createMultiLookup}
         */
        createMultiLookup: function(fieldOptions){
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

        /**
         * Lazy-initializer for creating an editor that utilizes a simple array or object as options.
         * @method createSimpleLookupEditor
         * @memberof spark.grid
         * @param {object} fieldOptions Properties for widget
         * @returns {object} Instance of a {@link spark.field.createSimpleLookup}
         */
        createSimpleLookupEditor: function(fieldOptions){
        	return function(container, options){
        		options.sparkEditor = spark.field.createSimpleLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        		setTimeout(function(){
        			var data = options.model[options.field] || options.model.defaults[options.field];
        			options.sparkEditor.value(data);
				}, 20);
        	}
        },

        /**
         * Lazy-initializer for creating an editor that utilizes a name/value pairing as options.
         * @method createSingleLookupEditor
         * @memberof spark.grid
         * @param {object} fieldOptions Properties for widget
         * @returns {object} Instance of a {@link spark.field.createSingleLookup}
         */
        createSingleLookupEditor: function(fieldOptions){
        	return function(container, options){
                options.sparkEditor = spark.field.createSingleLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        		setTimeout(function(){
        			var data = options.model[options.field] || options.model.defaults[options.field];
					options.sparkEditor.value(data);
				}, 20);
        	}
        },

        /**
         * Lazy-initializer for creating an editor that utilizes an invoke method to populate options.
         * @method createInvokeLookupEditor
         * @memberof spark.grid
         * @param {object} fieldOptions Properties for widget
         * @returns {object} Instance of a {@link spark.field.createInvokeLookup}
         */
        createInvokeLookupEditor: function(fieldOptions){
        	return function(container, options){
                options.sparkEditor = spark.field.createInvokeLookup($('<input data-bind="value:' + options.field + '"/>').appendTo(container), fieldOptions);
        	}
        }

    };

}

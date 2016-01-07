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

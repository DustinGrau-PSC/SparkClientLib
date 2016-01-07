/***** Plugins for the JSDO Library *****/

/**
 * AFP - ABL Filter Pattern
 *
 * Provides parameters from Kendo as-is, for filtering and sorting.
 * This expects the ABL code to be able to parse the resulting JSON
 * object into the appropriate values. To that end, see these class
 * files within the Spark toolkit: ClientParse.cls, KendoParse.cls
 *
 * Relies on the following annotations for your "read" operation:
 *  @openapi.openedge.method.property(name="mappingType", value="AFP").
 *  @openapi.openedge.method.property(name="capabilities", value="filter,id,orderBy,skip,sort,top").
 */
progress.data.PluginManager.addPlugin("AFP", {
    requestMapping: function(jsdo, params, info){
        var filter = {client: "KendoUI"},
            properties,
            capabilities;

        if (info.operation === "read") {
            properties = jsdo.getMethodProperties(info.operation);
            if (properties && properties.capabilities) {
                // Should be a comma-delimited list of options, without spaces.
                capabilities = properties.capabilities.replace(/\s/g, "").split(",");

                $.each(capabilities, function(i, capability){
                    // For each existing capability, provide a filter option.
                    if (params.hasOwnProperty(capability)) {
                        filter[capability] = params[capability];
                    }
                });
            }

            params = {filter: JSON.stringify(filter)};
        }

        return params;
    }
});
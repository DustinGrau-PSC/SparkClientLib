// Create an object for application navigation.
if (window.spark && kendo) {

    window.spark.nav = (function(kendo){
        return {
            /** Create a simplistic path-based router for site navigation.
             *  Options is an object with the following properties:
             *   - filePathPrefix: Relative location of physical files.
             *   - mainContentID: ID for loading content dynamically.
             *   - getLandingPage: Obtain name of landing page file.
             *   - onChange: Event callback on each change of route.
             *   - onLoad: Event callback after loading extra files.
             *
             * @param options Object
             * @returns kendo.Router
             */
            createSimpleRouter: function(options){
                // Options property must be an object.
                if (!options) { options = {}; }

                // Make sure property is set with a default ID.
                if (!options.mainContentID || options.mainContentID === "") {
                    options.mainContentID = "mainContent";
                }

                // Define a new router with specific paths.
                var router = new kendo.Router({
                    change: options.onChange || function(ev){}
                });

                // Define a simple routing patterns for this application.
                router.route("/", function(){
                    /**
                     * Returning to the index page may require the loading of a specific
                     * landing page. Therefore we must assume a callback will be required
                     * and so a promise will be used to track the result. This allows
                     * the getLandingPage method to be asynchronous as well.
                     */
                    var promise = jQuery.Deferred();
                    if (options.getLandingPage) {
                        // Replace local promise with returned promise.
                        promise = options.getLandingPage();
                    } else {
                        // Immediately resolve the local promise.
                        promise.resolve("");
                    }

                    // Setup for successful response from promise.
                    promise.done(function(page){
                        if (page !== "") {
                            // Load the model/view files and initialize page.
                            var path = options.filePathPrefix + page;
                            spark.loader.loadExtScreen(path, options.mainContentID, page)
                                .complete(function(){
                                    if (options.onLoad) {
                                        options.onLoad(page, path);
                                    }
                                });
                        } else {
                            // Just initialize the landing page as-is.
                            if (options.onLoad) {
                                options.onLoad("");
                            }
                        }
                    });
                });
                router.route("/logout", function(){
                    // Perform a logout and redirect to login page.
                    spark.getJsdoSession().logout()
                        .then(function(){
                            if (options.onLogout) {
                                options.onLogout(); // Perform post-logout action.
                            }
                        });
                });
                router.route("/:page", function(page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path);
                            }
                        });
                });
                router.route("/:sec/:page", function(sec, page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + sec + "/" + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path, sec);
                            }
                        });
                });
                router.route("/:sec/:sub/:page", function(sec, sub, page){
                    // Load the model/view files and initialize page.
                    var path = options.filePathPrefix + sec + "/" + sub + "/" + page;
                    spark.loader.loadExtScreen(path, options.mainContentID, page)
                        .complete(function(){
                            if (options.onLoad) {
                                options.onLoad(page, path, sec, sub);
                            }
                        });
                });

                return router;
            }
        };
    })(kendo);

}

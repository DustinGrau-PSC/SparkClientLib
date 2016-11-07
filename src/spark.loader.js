/**
 * @file Singleton object for external file loading.
 * @author Progress Services
 * @copyright Progress Software 2015-2016
 * @license Apache-2.0
 */
if (window.spark && jQuery && kendo) {

    /**
     * File loading operations for PMFO.
     * @namespace spark.loader
     * @memberof spark
     */
    window.spark.loader = (function($, kendo){
        return {
            /**
             * Loads an external screen (JS + HTML) from path into the DOM.
             * @method loadExtScreen
             * @memberof spark.loader
             * @param {string} rootPath Base name of file to be loaded
             * @param {string} contentID Unique DOM ID for anchoring loaded content
             * @param {string} pageName User-friendly name of page to load
             * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
             */
            loadExtScreen: function(rootPath, contentID, pageName){
                // Use jQuery Ajax to fetch the JS model file.
                return $.ajax({
                    dataType: "script",
                    url: rootPath + ".js",
                    success: function(jsResult){
                        // Use jQuery Ajax to fetch the HTML view file.
                        return $.ajax({
                            dataType: "html",
                            url: rootPath + ".html",
                            success: function(htmlResult){
                                // On success, add contents to DOM where specified.
                                kendo.destroy($("#" + contentID).children());
                                $("#" + contentID).empty();
                                $("#" + contentID).html(htmlResult);
                            },
                            error: function(result){
                                alert("Error loading HTML file " + rootPath + ".html");
                            }
                        });
                    },
                    error: function(result){
                        alert("Error loading JavaScript file " + rootPath + ".js");
                    }
                });
            },

            /**
             * Loads an external HTML modal from a specific location into the DOM.
             * @method loadExtInclude
             * @memberof spark.loader
             * @param {string} filePath Base path of file to be loaded
             * @param {string} contentID Unique DOM ID for anchoring loaded content
             * @param {string} templateID DOM ID of template in loaded file
             * @param {object} options Data to be applied to the template
             * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
             */
            loadExtInclude: function(filePath, contentID, modalName, options){
                // Use jQuery Ajax to fetch the modal content.
                return $.ajax({
                    dataType: "html",
                    url: filePath,
                    success: function(htmlResult){
                        // On success, add contents to DOM where specified.
                        kendo.destroy($("#" + contentID).children());
                        $("#" + contentID).empty();
                        $("#" + contentID).html(htmlResult);
                        $("[data-toggle=tooltip]").tooltip();
                    },
                    error: function(result){
                        alert("Error loading template file " + filePath);
                    }
                });
            },

            /**
             * Loads an external [Kendo Template]{@link http://docs.telerik.com/kendo-ui/framework/templates/overview} from a specific location into the DOM.
             * @method loadExtTemplate
             * @memberof spark.loader
             * @param {string} filePath Base path of file to be loaded
             * @param {string} contentID Unique DOM ID for anchoring loaded content
             * @param {string} templateID DOM ID of template in loaded file
             * @param {object} options Data to be applied to the template
             * @returns {object} [Promise/Deferred object instance]{@link https://api.jquery.com/category/deferred-object/}
             */
            loadExtTemplate: function(filePath, contentID, templateID, options){
                // Use jQuery Ajax to fetch the template script.
                return $.ajax({
                    dataType: "html",
                    url: filePath,
                    success: function(tmplResult){
                        // On success, add contents to DOM where specified.
                        $("#" + contentID).append(tmplResult);
                        var template = kendo.template($("#" + templateID).html());
                        var htmlBody = template(options || {});
                        kendo.destroy($("#" + contentID).children());
                        $("#" + contentID).empty();
                        $("#" + contentID).html(htmlBody);
                    },
                    error: function(result){
                        alert("Error loading template file " + filePath);
                    }
                });
            }
        };
    })(jQuery, kendo);

}

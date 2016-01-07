// Create an object with external file loader methods.
if (window.spark && jQuery && kendo) {

    window.spark.loader = (function($, kendo){
        return {
            // Loads an external screen (JS + HTML) from path into the DOM.
            loadExtScreen: function(rootPath, contentID, pageName, options){
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

            // Loads an external HTML modal from a specific location into the DOM.
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

            // Loads an external Kendo template from a specific location into the DOM.
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

/**
 * @file Singleton object for displaying on-screen messages.
 * @author Progress Services
 * @copyright Progress Software 2015-2017
 * @license Apache-2.0
 */
if (window.spark && jQuery && kendo) {

    /**
     * Notification operations for PMFO.
     * @namespace spark.notify
     * @memberof spark
     */
    window.spark.notify = (function($, kendo){
        return {
            /**
             * Sets a specific DOM element for handling notification events.
             * @method spark.notify.setNotificationArea
             * @memberof spark.notify
             * @param {string} selector Target DOM element as [jQuery selector]{@link https://api.jquery.com/category/selectors/}
             * @param {object} options Properties for widget
             * @returns {object} [kendo.ui.Notification]{@link http://docs.telerik.com/kendo-ui/api/javascript/ui/notification}
             */
            setNotificationArea: function(selector, options){
                var notificationObj = null; // Notification object instance.
                if ($(selector).length) {
                    // Create a new notification widget.
                    notificationObj = $(selector).kendoNotification($.extend({
                        appendTo: selector, // Element that anchors all messages.
                        autoHideAfter: 30000, // Hide the message after 30 seconds.
                        button: true // Display dismissal button in message area.
                    }, options)).getKendoNotification();

                    // Add a method to display a message and scroll into view.
                    notificationObj.showNotification = function(message, type){
                        var self = this;
                        if (self) {
                            // Type is "info" (default), "success", "warning", or "error".
                            if (typeof(message) === "string") {
                                // Single message as string.
                                self.show(message || "", type || "info");
                            } else if (Array.isArray(message)) {
                                $.each(message, function(i, msg){
                                    // Message is an array of strings.
                                    self.show(msg || "", type || "info");
                                });
                            }
                            if (this.options.appendTo) {
                                var container = $(self.options.appendTo);
                                if (container.length) {
                                    container.scrollTop(container[0].scrollHeight);
                                }
                            }
                        }
                    };
                }
                return notificationObj;
            }
        };
    })(jQuery, kendo);

}

// Create an object for displaying on-screen messages.
if (window.spark && jQuery && kendo) {

    window.spark.notify = (function($, kendo){
        return {
            setNotificationArea: function(selector, options){
                var notificationObj = null; // Notification object instance.
                if ($(selector).length) {
                    // Create a new notification widget.
                    notificationObj = $(selector).kendoNotification($.extend({
                        appendTo: selector, // Element that gets messages.
                        autoHideAfter: 30000, // Hide the message after 30 seconds.
                        button: true // Display dismissal button in message area.
                    }, options)).getKendoNotification();

                    // Add a method to display a message and scroll into view.
                    notificationObj.showNotification = function(message, type){
                        if (this) {
                            // Type is "info" (default), "success", "warning", or "error".
                            this.show(message || "", type || "info");
                            var container = $(this.options.appendTo);
                            if (container.length) {
                                container.scrollTop(container[0].scrollHeight);
                            }
                        }
                    };
                }
                return notificationObj;
            },
        };
    })(jQuery, kendo);

}

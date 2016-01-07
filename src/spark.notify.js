// Create an object for displaying on-screen messages.
if (window.spark && jQuery && kendo) {

    window.spark.notify = (function($, kendo){
        var _notificationObj = null; // Last notification object instance.

        return {
            setNotificationArea: function(selector, options){
                selector = selector || "#staticNotification";
                if ($(selector).length) {
                    _notificationObj = $(selector).kendoNotification($.extend({
                        appendTo: "#notificationArea", // Element that gets new messages.
                        autoHideAfter: 20000, // Hide the message after 20 seconds.
                        button: true // Display dismissal button in message area.
                    }, options)).getKendoNotification();
                } else {
                    _notificationObj = null; // Reset/clear last-known area.
                }
                return _notificationObj;
            },

            showStaticNotification: function(message, type){
                if (_notificationObj) {
                    _notificationObj.show(message, type || "info");
                    var container = $(_notificationObj.options.appendTo);
                    if (container.length) {
                        container.scrollTop(container[0].scrollHeight);
                    }
                }
            }
        };
    })(jQuery, kendo);

}

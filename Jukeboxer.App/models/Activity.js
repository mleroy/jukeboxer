(function () {
    "use strict";

    var Activity = WinJS.Class.define(
    function (name, type, data) {
        this.name = name;
        this.type = type;
        this.data = data;
        this.time = new Date();
    },
    {
    });

    WinJS.Namespace.define("Jukeboxer", {
        Activity: Activity
    });
})();
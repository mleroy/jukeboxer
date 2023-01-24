(function () {
    "use strict";
    
    var Request = WinJS.Class.define(
    function (id, name) {
        this.id = id;
        this.name = name;
        this.time = new Date();
    },
    {
    });

    WinJS.Namespace.define("Jukeboxer", {
        Request: Request
    });
})();
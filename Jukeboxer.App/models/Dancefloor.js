(function () {
    "use strict";

    var Dancefloor = WinJS.Class.define(
        function () {
            this._initObservable();
        },
        {
            clients: {},

            updateSetup:
                function (key, name) {
                    this.setProperty("name", name);

                    // Skip the identification if we're already connected and the key hasn't changed.
                    if (this.getProperty("key") === key && (Jukeboxer.network.state === Jukeboxer.Network.States.Connected || Jukeboxer.network.state === Jukeboxer.Network.States.Ready)) {
                        return new WinJS.Promise.wrap();
                    }

                    var that = this;
                    return Jukeboxer.network.identify(key, name).then(function () {
                        that.setProperty("key", key);
                    });
                }
        });

    WinJS.Class.mix(
        Dancefloor,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties(
        {
            name: undefined,
            key: undefined
        }));

    WinJS.Namespace.define("Jukeboxer", {
        Dancefloor: Dancefloor
    });
})();
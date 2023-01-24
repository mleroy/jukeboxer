(function () {
    "use strict";

    var Utils = WinJS.Class.define(
        function () {
            var that = this;

        },
        {
        },
        {
            GetNetworkConnectivityLevel:
                function () {
                    var connectionProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();

                    if (connectionProfile === null) {
                        return Windows.Networking.Connectivity.NetworkConnectivityLevel.none;
                    } else {
                        return connectionProfile.getNetworkConnectivityLevel();
                    }
                }
        });

    WinJS.Namespace.define("Jukeboxer", {
        Utils: Utils
    });
})();
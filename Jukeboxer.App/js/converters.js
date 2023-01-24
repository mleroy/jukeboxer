(function (WinJS) {
    "use strict";

    var formatDuration = function (timeInSeconds) {
        var minutes = Math.floor(timeInSeconds / 60);
        var seconds = Math.floor(timeInSeconds % 60);

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    };

    var durationConverter = WinJS.Binding.converter(function (timeinSeconds) {
        if (timeinSeconds === undefined) {
            return "0:00";
        }

        return formatDuration(timeinSeconds);
    });

    var formatShortTime = function (date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = 'am';
        if (hours > 12) {
            hours -= 12;
            ampm = 'pm';
        }
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        return hours + ':' + minutes + ' ' + ampm;
    };

    var timeConverter = WinJS.Binding.converter(function (date) {
        return formatShortTime(date);
    });

    var activityTextConverter = WinJS.Binding.converter(function (activity) {
        var t = '';

        if (activity.type === "vote") {
            var songText = '<b>' + activity.data.title + '</b> by <b>' + activity.data.artist + '</b>';
            t += ' voted for ' + songText;
        } else if (activity.type == "add") {
            var songText = '<b>' + activity.data.title + '</b> by <b>' + activity.data.artist + '</b>';
            t += ' added ' + songText + ' to the setlist';
        } else if (activity.type == "client join") {
            t += ' joined the party';
        }

        return t;
    });

    var networkStateConverter = WinJS.Binding.converter(function (networkState) {
        if (networkState == Jukeboxer.Network.States.Ready) {
            return ' connected';
        } else {
            // Return this for both 'Connecting' and 'Disconnected'
            return 'connecting ...';
        }
    });

    var networkStateToDisplayConverter = WinJS.Binding.converter(function (networkState) {
        return networkState !== Jukeboxer.Network.States.Disconnected ? 'block' : 'none';
    });

    var networkStateToDisplayInverseConverter = WinJS.Binding.converter(function (networkState) {
        return networkState !== Jukeboxer.Network.States.Disconnected ? 'none' : 'block';
    });

    var countToDisplayConverter = WinJS.Binding.converter(function (count) {
        return count > 0 ? "block" : "none";
    });

    var countToDisplayInverseConverter = WinJS.Binding.converter(function (count) {
        return count > 0 ? "none" : "block";
    });

    var stageRightCountToClass = WinJS.Binding.converter(function (count) {
        return count > 0 ? "songs" : "nosongs";
    });

    WinJS.Namespace.define("Jukeboxer.Converters", {
        formatDuration: formatDuration,
        durationConverter: durationConverter,
        formatShortTime: formatShortTime,
        timeConverter: timeConverter,
        activityTextConverter: activityTextConverter,
        networkStateConverter: networkStateConverter,
        networkStateToDisplayConverter: networkStateToDisplayConverter,
        networkStateToDisplayInverseConverter: networkStateToDisplayInverseConverter,
        countToDisplayConverter: countToDisplayConverter,
        countToDisplayInverseConverter: countToDisplayInverseConverter,
        stageRightCountToClass: stageRightCountToClass
    });
})(WinJS);
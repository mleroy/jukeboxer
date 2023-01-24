(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    var playlist = null;
    var repertoire = null;
    var network = null;
    var socket = null;
    var dancefloor = null;

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            var audioControl = document.querySelector('#currentSongAudio');

            Jukeboxer.playlist = new Jukeboxer.Playlist(audioControl);
            Jukeboxer.repertoire = new Jukeboxer.Repertoire();
            Jukeboxer.dancefloor = new Jukeboxer.Dancefloor();
            Jukeboxer.network = new Jukeboxer.Network();

            if (args.detail.previousExecutionState === activation.ApplicationExecutionState.terminated) {
                // This application has been reactivated from suspension.
                // Restore application state here.
                Windows.Storage.ApplicationData.current.localFolder.getFileAsync("playlist.wpl").then(function (file) {
                    return Jukeboxer.playlist.load(file);
                }).then(function () {
                    if (app.sessionState.currentIndex) {
                        return Jukeboxer.playlist.playSongFromIndex(app.sessionState.currentIndex);
                    }
                });

                if (app.sessionState.dancefloor) {
                    Jukeboxer.dancefloor.updateSetup(app.sessionState.dancefloor.key, app.sessionState.dancefloor.name);
                }
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }

            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.stage);
                }
            }));
        }
    });

    app.onunload = function (args) {
        Jukeboxer.network.closeSocket();

        Jukeboxer.playlist.songs.forEach(function (song) {
            if (song.thumbnailUrl !== Jukeboxer.SetlistSong.defaultThumbnailUrl) {
                URL.revokeObjectURL(song.thumbnailUrl);
            }
        });
    };

    app.oncheckpoint = function (args) {
        // This application is about to be suspended. Save any state that needs to persist across suspensions here. 
        // If you need to complete an asynchronous operation before your application is suspended, call args.setPromise().
        app.sessionState.history = nav.history;

        app.sessionState.currentIndex = Jukeboxer.playlist.currentIndex;
        app.sessionState.dancefloor = {
            name: Jukeboxer.dancefloor.name,
            key: Jukeboxer.dancefloor.key
        };

        // create a file within the app's local folder to save the playlist
        args.setPromise(Jukeboxer.playlist.save(Windows.Storage.ApplicationData.current.localFolder, "playlist" /* .wpl will be implied */));
    };

    //
    // Search contract
    //

    var searchPane = Windows.ApplicationModel.Search.SearchPane.getForCurrentView();

    searchPane.showOnKeyboardInput = true;
    searchPane.onquerysubmitted = function (eventObject) {
        if (WinJS.Navigation.location == Application.navigator.stage) {
            nav.navigate(Application.navigator.catalog, { search: eventObject.queryText });
        }
    };

    var localSuggestionSettings = new Windows.ApplicationModel.Search.LocalContentSuggestionSettings();
    localSuggestionSettings.enabled = true;
    localSuggestionSettings.locations.append(Windows.Storage.KnownFolders.musicLibrary);
    localSuggestionSettings.aqsFilter = "kind:=music";

    searchPane.setLocalContentSuggestionSettings(localSuggestionSettings);

    //
    // Settings
    //

    WinJS.Application.onsettings = function (e) {
        e.detail.applicationcommands = {
            "help":
                { title: "Help", href: "/pages/help.html" },
            "about":
                { title: "About", href: "/pages/privacypolicy.html" },
            "feedback":
                { title: "Feedback", href: "/pages/contact.html" }
        };

        WinJS.UI.SettingsFlyout.populateSettings(e);
    };

    WinJS.Namespace.define('Jukeboxer', {
        playlist: playlist,
        repertoire: repertoire,
        network: network,
        dancefloor: dancefloor
    });

    app.start();
})();

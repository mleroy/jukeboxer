(function () {
    "use strict";

    var viewModel;

    WinJS.UI.Pages.define("/pages/stage/stage.html", {

        init: function (element, options) {
            viewModel = WinJS.Binding.as(
                {
                    playlist: Jukeboxer.playlist,
                    network: Jukeboxer.network,
                    dancefloor: Jukeboxer.dancefloor
                });
        },

        ready: function (element, options) {
            setupEventListeners();

            appbar.winControl.hideCommands(appbar.querySelectorAll('.onSelection'));

            var listViewOptions = {
                itemDataSource: Jukeboxer.playlist.songs.dataSource,
                itemTemplate: storageRenderer,
                layout: new WinJS.UI.ListLayout(),
                selectionMode: "multi",
                onselectionchanged: selectionChangedHandler,
                oniteminvoked: playlistItemInvoked
            };

            var playlistListViewControl = new WinJS.UI.ListView(playlistListView, listViewOptions);

            WinJS.Binding.processAll(null, viewModel);

            WinJS.Binding.bind(Jukeboxer.network,
                {
                    state: function (state) {
                        // Container visiblity
                        switch (state) {
                            case Jukeboxer.Network.States.Disconnected:
                            case Jukeboxer.Network.States.ConnectionFailed:
                                setupPartyDetails.style.display = 'block';
                                partyDetails.style.display = 'none';
                                break;
                            default:
                                setupPartyDetails.style.display = 'none';
                                partyDetails.style.display = 'block';
                        }

                        // Connectivity icon
                        var connectivityIconChar, connectivityIconColor;
                        switch (state) {
                            case Jukeboxer.Network.States.Connecting:
                                connectivityIconChar = '';
                                connectivityIconColor = 'darkorange';
                                break;
                            case Jukeboxer.Network.States.Connected:
                                connectivityIconChar = '';
                                connectivityIconColor = 'yellow';
                                break;
                            case Jukeboxer.Network.States.Ready:
                                connectivityIconChar = '';
                                connectivityIconColor = 'green';
                                break;
                            default:
                                connectivityIconChar = '';
                                connectivityIconColor = 'red';
                        }

                        networkConnectivityIcon.innerText = connectivityIconChar;
                        networkConnectivityIcon.style.color = connectivityIconColor;
                    }
                });

            WinJS.Binding.bind(Jukeboxer.playlist, {
                currentSong: function (newSong, oldSong) {
                    // App shows default thumbnail on load, and when a song is loaded on stage, it's possible its thumbnail is the default one too
                    // In that case, don't do the animation.
                    if (newSong && currentSongAlbumArt.src.indexOf(newSong.thumbnailUrl) == -1) { // indexOf as the default image src has the ms-appx:// url format
                        WinJS.UI.Animation.fadeOut(currentSongAlbumArt).then(function () {
                            currentSongAlbumArt.src = newSong.thumbnailUrl;
                            WinJS.UI.Animation.fadeIn(currentSongAlbumArt);
                        });
                    }

                    requestorsListView.winControl.itemDataSource = newSong.requests.dataSource;
                },

                currentIndex: function (newIndex, oldIndex) {
                    var belowIndex = Math.max(0, newIndex - 1);

                    playlistListView.winControl.indexOfFirstVisible = belowIndex;

                    for (var i = 0; i < viewModel.playlist.songs.length; i++) {
                        var playlistItem = playlistListView.winControl.elementFromIndex(i);
                        var playlistItemNowPlaying = WinJS.Utilities.query('.playlistItemNowPlaying', playlistItem)[0];

                        if (playlistItem) {
                            if (i < newIndex) {
                                playlistItemNowPlaying.style.opacity = 0;
                                playlistItem.style.opacity = 0.5;
                            } else {
                                if (i == newIndex) {
                                    playlistItemNowPlaying.style.opacity = 1;
                                } else {
                                    playlistItemNowPlaying.style.opacity = 0;
                                }

                                playlistItem.style.opacity = 1;
                            }
                        }
                    }
                }
            });

            activitiesListView.winControl.itemDataSource = Jukeboxer.playlist.activities.dataSource;

            Jukeboxer.playlist.init();
        },

        unload: function () {
            removeListeners();
            WinJS.UI.Animation.exitPage(document.getElementsByClassName('area'));
        },

        getAnimationElements: function () {
            return _getAnimationElements();
        }
    });

    function setupEventListeners() {
        cmdLoadPlaylist.addEventListener("click", loadPlaylist, false);
        cmdSaveAsPlaylist.addEventListener("click", saveAsPlaylist, false);
        cmdRemove.addEventListener("click", cmdRemoveHandler, false);
        cmdVote.addEventListener("click", cmdVoteHandler, false);

        document.getElementById('currentSongPauseBtn').addEventListener('click', play, false);
        currentSongPreviousBtn.addEventListener('click', previous, false);
        currentSongNextBtn.addEventListener('click', next, false);

        currentSongProgressBar.onclick = progressClickHandler;

        Windows.Media.MediaControl.addEventListener("playpausetogglepressed", play, false);
        Windows.Media.MediaControl.addEventListener("playpressed", play, false);
        Windows.Media.MediaControl.addEventListener("stoppressed", stop, false);
        Windows.Media.MediaControl.addEventListener("pausepressed", pause, false);
        Windows.Media.MediaControl.addEventListener("previoustrackpressed", previous, false);
        Windows.Media.MediaControl.addEventListener("nexttrackpressed", next, false);
        Windows.Media.MediaControl.addEventListener("rewindpressed", rewind, false);
        Windows.Media.MediaControl.addEventListener("forwardpressed", forward, false);

        document.getElementById('setupPartyDetailsBtn').addEventListener("click", showSetup);
        document.getElementById('submitSetupButton').addEventListener("click", submitSetup);
        document.getElementById('connectionFlyoutButton').addEventListener("click", dismissConnectionFlyout);

        document.getElementById('addSongsCoverBtn').addEventListener("click", goToCatalog);
        document.getElementById('catalogNavigationItem').addEventListener('click', goToCatalog);

        setupFlyout.addEventListener('aftershow', flyoutOnAfterShow);
        setupFlyout.addEventListener('afterhide', flyoutOnAfterHide);
        connectionFlyout.addEventListener('aftershow', flyoutOnAfterShow);
        connectionFlyout.addEventListener('afterhide', flyoutOnAfterHide);
    }

    function removeListeners() {
        cmdLoadPlaylist.removeEventListener("click", loadPlaylist);
        cmdSaveAsPlaylist.removeEventListener("click", saveAsPlaylist);
        cmdRemove.removeEventListener("click", cmdRemoveHandler);
        cmdVote.removeEventListener("click", cmdVoteHandler);

        document.getElementById('currentSongPauseBtn').removeEventListener('click', play);
        currentSongPreviousBtn.removeEventListener('click', previous);
        currentSongNextBtn.removeEventListener('click', next);

        currentSongProgressBar.removeEventListener('click', progressClickHandler);

        Windows.Media.MediaControl.removeEventListener("playpausetogglepressed", play);
        Windows.Media.MediaControl.removeEventListener("playpressed", play);
        Windows.Media.MediaControl.removeEventListener("stoppressed", stop);
        Windows.Media.MediaControl.removeEventListener("pausepressed", pause);
        Windows.Media.MediaControl.removeEventListener("previoustrackpressed", previous);
        Windows.Media.MediaControl.removeEventListener("nexttrackpressed", next);
        Windows.Media.MediaControl.removeEventListener("rewindpressed", rewind);
        Windows.Media.MediaControl.removeEventListener("forwardpressed", forward);

        document.getElementById('setupPartyDetailsBtn').removeEventListener("click", showSetup);
        document.getElementById('submitSetupButton').removeEventListener("click", submitSetup);
        document.getElementById('connectionFlyoutButton').removeEventListener("click", dismissConnectionFlyout);

        document.getElementById('addSongsCoverBtn').removeEventListener("click", goToCatalog);
        document.getElementById('catalogNavigationItem').removeEventListener('click', goToCatalog);

        setupFlyout.removeEventListener('aftershow', flyoutOnAfterShow);
        setupFlyout.removeEventListener('afterhide', flyoutOnAfterHide);
        connectionFlyout.removeEventListener('aftershow', flyoutOnAfterShow);
        connectionFlyout.removeEventListener('afterhide', flyoutOnAfterHide);
    }

    function storageRenderer(itemPromise, element) {
        var nowPlaying;
        var albumArt;
        var title;
        var artist;
        var requestCount;
        var duration;

        if (element === null) {
            // dom is not recycled, so create inital structure
            element = document.createElement("div");
            element.className = "playlistItem";
            element.innerHTML = "";
            element.innerHTML += "<img class='playlistItemNowPlaying' src='/images/headphones_white_32.png' />";
            element.innerHTML += "<img class='playlistItemAlbumArt' />";
            element.innerHTML += "<div class='playlistItemTitle win-type-ellipsis'></div>";
            element.innerHTML += "<div class='playlistItemArtist win-type-ellipsis'></div>";
            element.innerHTML += "<div class='playlistItemRequestCount'></div>";
            element.innerHTML += "<div class='playlistItemDuration'></div>";
        }

        nowPlaying = element.querySelector("img.playlistItemNowPlaying");
        albumArt = element.querySelector("img.playlistItemAlbumArt");
        title = element.querySelector("div.playlistItemTitle");
        artist = element.querySelector("div.playlistItemArtist");
        requestCount = element.querySelector("div.playlistItemRequestCount");
        duration = element.querySelector("div.playlistItemDuration");

        // Set initial properties
        nowPlaying.style.opacity = 0;
        albumArt.style.opacity = 0.75;
        albumArt.src = '/images/DefaultAlbumArt_48.png';

        return {
            element: element,
            renderComplete: itemPromise.then(function (item) {
                artist.innerText = item.data.artist;
                title.innerText = item.data.title;
                requestCount.innerText = item.data.requests.length + ' ';
                duration.innerText = Jukeboxer.Converters.formatDuration(item.data.duration);

                if (item.index < viewModel.playlist.currentIndex) {
                    element.style.opacity = 0.5;
                } else {
                    if (item.index == viewModel.playlist.currentIndex) {
                        WinJS.UI.Animation.fadeIn(nowPlaying);
                    }

                    element.style.opacity = 1;
                }

                return item.ready;
            }).then(function (item) {
                WinJS.Binding.bind(item.data.requests, {
                    length: function (count) {
                        requestCount.innerText = count + ' ';
                    }
                });

                item.data.getThumbnailUrl().then(function () {
                    albumArt.src = item.data.thumbnailUrl;

                    // When the 'on stage' song is first initialized, we don't have the thumbnail and it uses the default
                    // as we load the thumbnails for the setlist, we can update the 'on stage' one if needed
                    if (item.index == viewModel.playlist.currentIndex && currentSongAlbumArt.src !== item.data.thumbnailUrl) {
                        WinJS.UI.Animation.fadeOut(currentSongAlbumArt).then(function () {
                            currentSongAlbumArt.src = item.data.thumbnailUrl;
                            WinJS.UI.Animation.fadeIn(currentSongAlbumArt);
                        });
                    }
                });
            })
        }
    }

    function playlistItemInvoked(evt) {
        evt.detail.itemPromise.then(function (songItem) {
            Jukeboxer.playlist.playSongFromIndex(songItem.index);
        });
    }

    function loadPlaylist() {
        var picker = new Windows.Storage.Pickers.FileOpenPicker();
        picker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.musicLibrary;
        picker.fileTypeFilter.replaceAll([".m3u", ".wpl", ".zpl"]);

        picker.pickSingleFileAsync()
            .then(function (item) {
                if (item) {
                    return Jukeboxer.playlist.load(item);
                }
            });
    }

    function saveAsPlaylist() {
        var picker = new Windows.Storage.Pickers.FileSavePicker();
        picker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.musicLibrary;
        picker.defaultFileExtension = ".wpl";
        picker.suggestedFileName = "Jukeboxer";

        picker.fileTypeChoices.clear();
        picker.fileTypeChoices.insert("Windows Media", [".wpl"]);
        picker.fileTypeChoices.insert("Zune", [".zpl"]);
        picker.fileTypeChoices.insert("M3U", [".m3u"]);

        picker.pickSaveFileAsync().then(function (file) {
            if (file) {
                return Jukeboxer.playlist.save(Windows.Storage.KnownFolders.musicLibrary, file.displayName, file.displayType);
            } else {
                return WinJS.Promise.wrap(null);
            }
        }).then(function () {
            appbar.winControl.hide();
        });
    }

    function play() {
        Jukeboxer.playlist.play();
    }

    function pause() {
        Jukeboxer.playlist.pause();
    }

    function stop() {
        Jukeboxer.playlist.stop();
    }

    function previous() {
        Jukeboxer.playlist.previous();
    }

    function next() {
        Jukeboxer.playlist.next();
    }

    function rewind() {
        Jukeboxer.playlist.rewind();
    }

    function forward() {
        Jukeboxer.playlist.forward();
    }

    function progressClickHandler(evt) {
        Jukeboxer.playlist.seek(evt.offsetX / evt.currentTarget.clientWidth);
    };

    function goToCatalog(e) {
        WinJS.UI.Animation.exitPage(_getAnimationElements()).done(function () {
            if (WinJS.Navigation.canGoForward) {
                // Clears the eventual search results by searching for nothing
                Jukeboxer.repertoire.search('').then(function () {
                    WinJS.Navigation.forward();
                });
            } else {
                WinJS.Navigation.navigate("/pages/catalog/catalog.html");
            }
        });
    }

    function cmdRemoveHandler(e) {
        var indicesToRemove = [];
        playlistListView.winControl.selection.getItems().then(function (items) {
            items.forEach(function (item) {
                indicesToRemove.push(item.index);
            });
        });
        Jukeboxer.playlist.removeSongs(indicesToRemove);
    }

    function cmdVoteHandler(e) {
        playlistListView.winControl.selection.getItems().then(function (items) {
            items.forEach(function (item) {
                Jukeboxer.playlist.vote(item.data.id, undefined /* client ID */, 'DJ').then(function (worked) {
                    if (worked) {
                        // TODO: on an add/vote, don't resend the whole playlist but only broadcast the event which will be interpreted by each client
                        Jukeboxer.network.sendMessage('UpdateSetlist', { songs: Jukeboxer.playlist.getSongsForWeb(), currentIndex: Jukeboxer.playlist.currentIndex });
                    }
                });
            });
        });
    }

    function selectionChangedHandler() {
        var appBar = appbar.winControl;
        var listView = playlistListView.winControl;

        if (listView.selection.count() > 0) {
            appBar.showCommands(appbar.querySelectorAll('.onSelection'));
            appBar.show();
        } else {
            appBar.hide();
            appBar.hideCommands(appbar.querySelectorAll('.onSelection'));
        }
    }

    function dismissConnectionFlyout() {
        connectionFlyout.winControl.hide();

        // Remember that user saw this dialog
        Windows.Storage.ApplicationData.current.localSettings.values['connectionFRE'] = 1;
    }

    function showSetup(clickEvt) {
        setupFlyout.winControl.show(document.getElementById('setupPartyDetailsBtn'));
    }

    function submitSetup(clickEvt) {
        var partyName = document.getElementById('partyName');
        var partyNameError = document.getElementById('partyNameError');
        var partyUrl = document.getElementById('partyUrl');
        var partyUrlError = document.getElementById('partyUrlError');

        var name = partyName.value;
        var key = partyUrl.value;


        var allGood = true;

        if (!name) {
            partyNameError.textContent = " Please enter the name for your party, ex.: \"Ted's 20th\"";
            partyNameError.style.display = 'block';
            allGood = false;
        } else {
            partyNameError.style.display = 'none';
        }

        if (!key) {
            partyUrlError.textContent = " Enter a short and easy to type URL for mobile devices.";
            partyUrlError.style.display = 'block';
            allGood = false;
        } else {
            key = key.toLowerCase();

            if (key.match(/[^a-z0-9-_]/g, "")) {
                partyUrlError.innerHTML = " URL contains invalid characters. Allowed characters are <b>a-z</b>, <b>0-9</b>, <b>-</b> and <b>_</b>.";
                partyUrlError.style.display = 'block';
                allGood = false;
            } else {
                partyUrlError.style.display = 'none';
            }
        }

        if (allGood) {
            Jukeboxer.dancefloor.updateSetup(key, name).then(function () { /* Success */
                setupFlyout.winControl.hide();
                appbar.winControl.hide();

                // Show FRE dialog
                if (!Windows.Storage.ApplicationData.current.localSettings.values['connectionFRE']) {
                    connectionFlyout.winControl.show(partyDetails);
                }
            }, function (x) { /* Error */
                partyUrlError.textContent = " This party URL already exists, please type something else.";
                partyUrlError.style.display = 'block';
            });
        }
    }

    function _getAnimationElements() {
        return [currentSongContainer, connectionContainer, setlistContainer, dancefloorContainer];
    }

    function flyoutOnAfterHide() {
        Windows.ApplicationModel.Search.SearchPane.getForCurrentView().showOnKeyboardInput = true;
    };

    function flyoutOnAfterShow() {
        Windows.ApplicationModel.Search.SearchPane.getForCurrentView().showOnKeyboardInput = false;
    };
})();


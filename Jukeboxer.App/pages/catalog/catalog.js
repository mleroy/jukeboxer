(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/catalog/catalog.html", {

        ready: function (element, options) {
            setupListeners();

            appbar.winControl.hideCommands(appbar.querySelectorAll('.onSelection'));

            appProgressBar.value = 0;
            var progressBarShown = false;

            handleCover(-1);

            WinJS.Promise.join([
                Jukeboxer.repertoire.init().then(function (count) {
                    return count;
                }, null,
                function (progress) {
                    if (!progressBarShown) {
                        progressBarShown = true;
                        WinJS.UI.Animation.fadeIn(appProgressBar);
                    }
                    appProgressBar.value += progress;
                }),
                WinJS.UI.processAll()
            ]).then(function (promises) {
                if (progressBarShown) {
                    WinJS.UI.Animation.fadeOut(appProgressBar);
                }

                handleCover(promises[0]);
                loadListViewControl(Jukeboxer.repertoire.dbDataSource);

                if (WinJS.Navigation.state && WinJS.Navigation.state.search) {
                    search(WinJS.Navigation.state.search);
                    delete WinJS.Navigation.state.search;
                }

                return Jukeboxer.repertoire.getSongIndex();
            }).then(function (table) {
                if (alphabet) {
                    WinJS.UI.Animation.fadeIn(alphabet).then(function () {
                        _setAlphabet(table);
                    });
                }
            });
        },

        unload:
            function () {
                removeListeners();
            },

        getAnimationElements: function () {
            var items = [repertoireListView];

            // Fadeout the alphabet, but don't fade-in as it's only shown after the listview renders
            if (alphabet.style.opacity == 1) {
                items.push(alphabet);
            }

            return items;
        }
    });

    function _setAlphabet(table) {
        var letters = document.querySelectorAll('#alphabet *');

        for (var i = 0; i < letters.length; i++) {
            var letterEl = letters[i];
            var letter = letterEl.getAttribute("data-letter");

            if (table[letter] !== undefined) {
                letterEl.setAttribute("data-index", table[letter]);
            }
        }
    }

    function setupListeners() {
        document.getElementById('cmdAddToPlaylist').addEventListener('click', cmdAddToPlaylistHandler);
        document.getElementById('cmdClearSelection').addEventListener('click', cmdClearSelectionHandler);
        document.getElementById('cmdSync').addEventListener('click', cmdSyncHandler);
        document.getElementById('stageNavigationItem').addEventListener('click', goToStage);

        repertoireListView.addEventListener('selectionchanged', selectionChangedHandler);
        repertoireListView.addEventListener('iteminvoked', itemInvokedHandler);

        alphabet.addEventListener('click', alphabetHandler);

        Windows.ApplicationModel.Search.SearchPane.getForCurrentView().addEventListener('querysubmitted', querySubmittedHandler);
    }

    function removeListeners() {
        document.getElementById('cmdAddToPlaylist').removeEventListener('click', cmdAddToPlaylistHandler);
        document.getElementById('cmdClearSelection').removeEventListener('click', cmdClearSelectionHandler);
        document.getElementById('cmdSync').removeEventListener('click', cmdSyncHandler);
        document.getElementById('stageNavigationItem').removeEventListener('click', goToStage);

        repertoireListView.removeEventListener('selectionchanged', selectionChangedHandler);
        repertoireListView.removeEventListener('iteminvoked', itemInvokedHandler);

        alphabet.removeEventListener('click', alphabetHandler);

        Windows.ApplicationModel.Search.SearchPane.getForCurrentView().removeEventListener('querysubmitted', querySubmittedHandler);
    }

    function loadListViewControl(dataSource) {
        var container = document.getElementById("repertoireListView");
        var listViewOptions = {
            itemDataSource: dataSource,
            itemTemplate: itemRenderer,
            layout: new WinJS.UI.ListLayout(),
            selectionMode: "multi",
            tapBehavior: "toggleSelect"
        };

        var listViewControl = new WinJS.UI.ListView(container, listViewOptions);
    };

    function itemRenderer(itemPromise) {

        var itemTemplate;
        var container = document.createElement("div");

        return {
            element: container,

            renderComplete: itemPromise.then(function (item, index) {

                if (Jukeboxer.repertoire.isSearchMode()) {
                    itemTemplate = document.getElementById('searchResultItemTemplate');
                } else {
                    if (item.data.itemType == 'artist') {
                        itemTemplate = document.getElementById('artistItemTemplate');
                    } else if (item.data.itemType == 'album') {
                        itemTemplate = document.getElementById('albumItemTemplate');
                    } else {
                        itemTemplate = document.getElementById('songItemTemplate');
                    }
                }

                // If user switches view while catalog is still rendering, itemTemplate will be null
                // The right of solving this is probably to cancel unfulfilled promises on view unload
                if (itemTemplate) {
                    itemTemplate.winControl.render(item.data, container);
                }

                return item.ready;
            }).then(function (item) {
                if (item.data.itemType == 'album') {
                    var albumArt = container.querySelector('.albumArt');

                    Jukeboxer.RepertoireSong.getThumbnailUrlForAlbumItem(item.data).then(function (url) {
                        // See comment on top of if (itemTemplate) for reasoning
                        if (albumArt) {
                            albumArt.src = url;
                            WinJS.UI.Animation.fadeIn(albumArt);
                        }
                    });
                }
            })
        }
    }

    function goToStage() {
        WinJS.UI.Animation.exitPage(repertoireListView).done(function () {
            if (WinJS.Navigation.canGoBack) {
                WinJS.Navigation.back();
            } else {
                WinJS.Navigation.navigate("/pages/stage/stage.html");
            }
        });
    }

    function itemInvokedHandler(evt) {
        evt.detail.itemPromise.done(function (invokedItem) {
            if (invokedItem.data.itemType) {
                repertoireListView.winControl.selection.remove(invokedItem.index);
                msSetImmediate(function () {
                    toggleSelectionUntil(invokedItem.index + 1, invokedItem.data.itemType);
                });
            }
        });
    }

    // Will select all items until an item of type itemType is met
    function toggleSelectionUntil(index, itemType) {
        var repertoireListView = document.getElementById('repertoireListView');
        if (repertoireListView) {
            repertoireListView.winControl.itemDataSource.itemFromIndex(index).then(function (item) {
                if (item) {
                    if (!item.data.itemType) { // Song item
                        repertoireListView.winControl.selection.add(index).then(function () {
                            msSetImmediate(function () {
                                toggleSelectionUntil(index + 1, itemType);
                            });
                        });
                    } else if (itemType == "artist" && item.data.itemType == "album") { // If we're on an album and we want to stop at the next artist, continue
                        msSetImmediate(function () {
                            toggleSelectionUntil(index + 1, itemType);
                        });
                    }
                }
            });
        }
    }

    function cmdAddToPlaylistHandler() {
        if (repertoireListView.winControl.selection.count() > 0) {
            repertoireListView.winControl.selection.getItems().then(function (items) {

                items.forEach(function (item) {
                    if (item.data.itemType === undefined) { // undefined === song
                        Jukeboxer.playlist.vote(item.data.id, undefined /* client ID */, 'DJ', item.data);
                    }
                });

                repertoireListView.winControl.selection.clear();
            });
        }
    }

    function cmdClearSelectionHandler() {
        repertoireListView.winControl.selection.clear();
    }

    function selectionChangedHandler() {
        var appBar = appbar.winControl;
        var listView = repertoireListView.winControl;

        if (listView.selection.count() > 0) {
            appBar.showCommands(appbar.querySelectorAll('.onSelection'));
            appBar.show();
        } else {
            appBar.hide();
            appBar.hideCommands(appbar.querySelectorAll('.onSelection'));
        }
    }

    function cmdSyncHandler() {
        // Reset progress bar and unhook data source as keeping it bound creates weird behavior while it's emptied & repopulated
        appProgressBar.value = 0;
        repertoireListView.winControl.itemDataSource = null;

        handleCover(-1);
        appbar.winControl.hide();

        WinJS.UI.Animation.fadeIn(appProgressBar).then(function () {
            Jukeboxer.repertoire.sync()
                .then(function (count) {
                    // Now that the data source is stable, bind it to list view
                    repertoireListView.winControl.itemDataSource = Jukeboxer.repertoire.dbDataSource;
                    handleCover(count);
                    WinJS.UI.Animation.fadeOut(appProgressBar);

                    // Update server
                    Jukeboxer.network.sendCatalog();
                },
                null,
                function (progress) {
                    appProgressBar.value += progress;
                });
        });
    }

    function querySubmittedHandler(evt) {
        search(evt.queryText);
    }

    function search(kw) {
        handleCover(-1);

        // The 'search' method invalidates the listeners (ex.: data source)
        // If the catalog was still rendering, it will create a race condition and crash
        // To avoid conflits, first detach the data source, then search and re-attach it.
        repertoireListView.winControl.itemDataSource = null;
        Jukeboxer.repertoire.search(kw).then(function () {
            return Jukeboxer.repertoire.dbDataSource.getCount()
        }).then(function (count) {
            handleCover(count);

            repertoireListView.winControl.itemDataSource = Jukeboxer.repertoire.dbDataSource;
        });
    };

    function alphabetHandler(evt) {
        var index = evt.target.getAttribute("data-index");

        if (index != null) {
            repertoireListView.winControl.indexOfFirstVisible = index;
        }
    }

    function handleCover(count) {
        var cover = document.getElementById('repertoireCover');
        if (count > 0) {
            cover.style.display = 'none';
            repertoireListView.style.display = 'block';
            if (repertoireListView.winControl) {
                repertoireListView.winControl.forceLayout();
            }
        } else if (count < 0) {
            repertoireListView.style.display = 'none';
            cover.innerText = "Jukeboxer is looking for music in your library ...";
            cover.style.display = 'block';
        } else {
            repertoireListView.style.display = 'none';
            cover.style.display = 'block';

            if (Jukeboxer.repertoire.isSearchMode()) {
                cover.innerText = "No results for your search.";
            } else {
                cover.innerText = "Jukeboxer couldn't find any music in your library. Note that we can't play protected songs (ex.: from Xbox Music).";
            }
        }
    }
})();

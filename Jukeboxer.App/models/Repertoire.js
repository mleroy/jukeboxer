/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
/// <reference path="/js/default.js" />
/// <reference path="/models/Song.js" />

(function () {
    "use strict";

    var Repertoire = WinJS.Class.define(
        function () {
            this.dbDataSource = new DataSources.IndexedDbDataSource('Jukeboxer', 1, 'Repertoire', this._upgradeNeededHandler);
            this.dbDataSource.setSearchableFields(["artist", "album", "title"]);
            this.dbDataSource.setItemSearchableFn(function (item) {
                return item.itemType === undefined;
            });
        },
        {
            init:
                function () {
                    var that = this;
                    return new WinJS.Promise(function (complete, error, progress) {
                        that.dbDataSource.getCount().then(function (count) {
                            if (!that.isSearchMode() && count == 0) {
                                that.sync().then(function (count) {
                                    complete(count);
                                }, null, progress);
                            } else {
                                complete(count);
                            }
                        });
                    });
                },

            _syncing: false,

            _db: undefined,

            _upgradeNeededHandler:
                function (evt) {
                    if (this._db) {
                        this._db.close();
                    }

                    this._db = evt.target.result;

                    var txn = evt.target.transaction;

                    // Note that we set the returned object store to a variable
                    // in order to make further calls (index creation) on that object store.
                    var repertoireStore = this._db.createObjectStore("Repertoire", { keyPath: "id", autoIncrement: false });

                    txn.oncomplete = function () {
                        console.log("Created the database.");
                    }
                },

            _getStorageDataSource:
                function () {
                    var dataSourceOptions = {
                        mode: Windows.Storage.FileProperties.ThumbnailMode.singleItem,
                        requestedThumbnailSize: 32,
                        thumbnailOptions: Windows.Storage.FileProperties.ThumbnailOptions.useCurrentScale
                    };

                    return new WinJS.UI.StorageDataSource(this._getFileQuery(), dataSourceOptions);
                },

            _getFileQuery:
                function () {
                    var queryOptions = new Windows.Storage.Search.QueryOptions();
                    queryOptions.folderDepth = Windows.Storage.Search.FolderDepth.deep;
                    queryOptions.indexerOption = Windows.Storage.Search.IndexerOption.useIndexerWhenAvailable;
                    queryOptions.applicationSearchFilter = "System.Kind:System.Kind#Music AND System.DRM.IsProtected:System.StructuredQueryType.Boolean#False";
                    queryOptions.sortOrder.clear();

                    // Music property names: http://msdn.microsoft.com/en-us/library/windows/desktop/ff516478(v=vs.85).aspx
                    queryOptions.sortOrder.append({ propertyName: "System.Music.AlbumArtist", ascendingOrder: true });
                    queryOptions.sortOrder.append({ propertyName: "System.Music.AlbumTitle", ascendingOrder: true });
                    queryOptions.sortOrder.append({ propertyName: "System.Music.PartOfSet", ascendingOrder: true });
                    queryOptions.sortOrder.append({ propertyName: "System.Music.TrackNumber", ascendingOrder: true });

                    return Windows.Storage.KnownFolders.musicLibrary.createFileQueryWithOptions(queryOptions);
                },

            _getSongItemsFromStorage:
                function () {
                    var songs = [];
                    var storageDataSource = this._getStorageDataSource();

                    return storageDataSource.getCount()
                        .then(function (count) {
                            var p = [];

                            for (var i = 0; i < count; i++) {
                                var itemPromise = storageDataSource.itemFromIndex(i);

                                p.push(itemPromise);
                            }

                            return WinJS.Promise.join(p);
                        })
                        .then(function (items) {
                            var lastArtist;
                            var lastAlbum;

                            var totalIndex = 0;

                            items.forEach(function (item, index) {
                                var song = Jukeboxer.RepertoireSong.fromStorage(item);

                                if (song.duration > 0) {
                                    if (song.artist !== lastArtist) {
                                        lastArtist = song.artist;

                                        songs.push({
                                            id: totalIndex++,
                                            artist: song.artist,
                                            itemType: 'artist'
                                        });
                                    }

                                    if (song.album !== lastAlbum) {
                                        lastAlbum = song.album;

                                        songs.push({
                                            id: totalIndex++,
                                            album: song.album,
                                            firstSongPath: song.path,
                                            thumbnailUrl: "/images/DefaultAlbumArt_256.png",
                                            itemType: 'album'
                                        });
                                    }

                                    song.id = totalIndex++;
                                    songs.push(song);
                                }
                            });

                            return songs;
                        });
                },

            printDb:
                function () {
                    var that = this;

                    this.dbDataSource.getCount().then(function (count) {
                        var p = [];

                        for (var i = 0; i < count; i++) {
                            p.push(that.dbDataSource.itemFromIndex(i));
                        }

                        WinJS.Promise.join(p).then(function (dbItems) {
                            dbItems.forEach(function (dbItem) {
                                console.log(JSON.stringify(dbItem));
                            });
                        });
                    });
                },

            getSongById:
                function (id) {
                    return this.dbDataSource.itemFromKey(id).then(function (item) {
                        return item.target.result;
                    });
                },

            getSongByPath:
                function (path) {
                    return this.dbDataSource.itemFromProperty('path', path);
                },

            getSongsForWeb:
                function () {
                    var that = this;

                    // Clear eventual search
                    return this.search('').then(function () {
                        return that.dbDataSource.getCount();
                    }).then(function (count) {
                        var p = [];
                        for (var i = 0; i < count; i++) {
                            (function (j) {
                                p[j] = that.dbDataSource.itemFromIndex(j);
                            })(i);
                        }

                        return WinJS.Promise.join(p);
                    }).then(function (dbItems) {
                        var songs = [];
                        for (var i = 0; i < dbItems.length; i++) {
                            var data = dbItems[i].data;

                            if (data.itemType === undefined) {
                                songs.push(Jukeboxer.RepertoireSong.dbItemToWeb(data));
                            }
                        }
                        return songs;
                    });
                },

            // Returns a table of 'letter' -> 'first index'
            getSongIndex:
                function() {
                    var that = this;

                    // Clear eventual search
                    return this.search('').then(function () {
                        return that.dbDataSource.getCount();
                    }).then(function (count) {
                        var p = [];
                        for (var i = 0; i < count; i++) {
                            (function (j) {
                                p[j] = that.dbDataSource.itemFromIndex(j);
                            })(i);
                        }

                        return WinJS.Promise.join(p);
                    }).then(function (dbItems) {
                        var table = {};

                        for (var i = 0; i < dbItems.length; i++) {
                            var data = dbItems[i].data;

                            if (data.itemType === 'artist') {
                                var letter = data.artist.charAt(0).toLowerCase();

                                if (table[letter] === undefined) {
                                    table[letter] = i;
                                }
                            }
                        }

                        return table;
                    });
                },

            sync:
                function () {
                    if (this._syncing) {
                        return WinJS.Promise.wrap(-1);
                    }

                    this._syncing = true;

                    var that = this;
                    return new WinJS.Promise(function (complete, error, progress) {
                        WinJS.Promise.join([
                            that.dbDataSource.nuke(),
                            that._getSongItemsFromStorage()
                        ]).then(function (completedPromises) {
                            var songItems = completedPromises[1];

                            that.dbDataSource.beginEdits();
                            var p = [];
                            var progressDelta = 100 / songItems.length;

                            songItems.forEach(function (songItem, index) {
                                p.push(
                                    that.dbDataSource.insertAtEnd(null, songItem).then(function (newItemInDb) {
                                        console.log('Added song: ' + newItemInDb.key);
                                        progress(progressDelta);
                                    }));
                            });

                            return WinJS.Promise.join(p);
                        })
                        .done(function (promises) {
                            that.dbDataSource.endEdits();
                            that._syncing = false;
                            complete(promises.length);
                        });
                    });
                },

            nuke:
                function () {
                    this.dbDataSource.nuke();
                },

            search:
                function (kw) {
                    return this.dbDataSource.setSearchKeyword(kw);
                },

            isSearchMode:
                function () {
                    return this.dbDataSource.isSearch();
                }
        });

    WinJS.Namespace.define("Jukeboxer", {
        Repertoire: Repertoire
    });
})();
(function () {
    "use strict";

    var playChar = '';
    var pauseChar = '';
    var voteChar = '';

    var previousTrackThreshold = 1;

    var Playlist = WinJS.Class.define(
        function (audioControl) {
            var that = this;

            this._initObservable();

            this.audioControl = audioControl;
            this.audioControl.onended = function () {
                that.next();
            };
            this.audioControl.ontimeupdate = function () {
                that.setProperty("currentTime", that.audioControl.currentTime);
            }

            this.songs.oniteminserted = function () { that.stateHandler(); };
            this.songs.onitemremoved = function () { that.stateHandler(); };

            WinJS.Binding.bind(this, {
                currentIndex: function () {
                    that.stateHandler()
                }
            });

            // Set observable properties here
            this.setProperty("playPauseChar", playChar);
            this.setProperty("currentIndex", -1);
            this.setProperty("currentTime", 0);
            this.setProperty("currentSong", new Jukeboxer.SetlistSong());
        },
        {
            // Instance members
            songs: new WinJS.Binding.List(),
            activities: new WinJS.Binding.List(),

            // Handlers
            stateHandler: function () {
                this.setProperty("previousDisabled", this.songs.length == 0);
                this.setProperty("nextDisabled", this.getProperty('currentIndex') >= this.songs.length - 1);
                this.setProperty("playPauseDisabled", this.songs.length == 0);

                if (this.songs.length == 0) {
                    this.audioControl.src = '';
                    this.setProperty("currentSong", new Jukeboxer.SetlistSong());
                    this.setProperty("currentIndex", -1);
                    this.setProperty("currentTime", 0);
                    this.setProperty("playPauseChar", playChar);

                    Windows.Media.MediaControl.isPlaying = false;
                    Windows.Media.MediaControl.artistName = '';
                    Windows.Media.MediaControl.trackName = '';
                }
            },

            // Private
            _loadInitialSong: function () {
                if (this.songs.length > 0 && this.currentIndex >= 0) {
                    this.setProperty("currentSong", this.songs.getAt(this.getProperty('currentIndex')));
                }
            },

            // Public
            init: function () {
                this._loadInitialSong();

                this.setProperty("previousDisabled", this.songs.length == 0);
                this.setProperty("nextDisabled", this.getProperty('currentIndex') >= this.songs.length - 1);
                this.setProperty("playPauseDisabled", this.songs.length == 0);
            },

            addActivity:
                function (name, type, data) {
                    var activity = new Jukeboxer.Activity(name, type, data);
                    this.activities.unshift(activity);
                },

            vote:
                function (songId, clientId, clientName, repertoireSong) {
                    var that = this;

                    // Fetch song in case we need to add it
                    // Also eases the flow of promises to do it this way
                    var repertoireSongPromise = repertoireSong
                        ? WinJS.Promise.wrap(repertoireSong)
                        : Jukeboxer.repertoire.getSongById(songId);

                    return repertoireSongPromise.then(function (repSong) {
                        return Jukeboxer.SetlistSong.fromRepertoire(repSong);
                    }).then(function (song) {
                        var index = that.getSongIndexFromId(songId);

                        // Song isn't in setlist after the current index. Add it.
                        if (index === undefined) {
                            that.songs.push(song);

                            // When a client adds a song, automatically vote for it too.
                            if (clientId !== undefined) {
                                song.requests.push(new Jukeboxer.Request(clientId, clientName));
                            }

                            that.addActivity(clientName, 'add', song);

                            index = that.songs.length - 1;
                        } else {
                            // Song is in setlist
                            var song = that.songs.getAt(index);

                            if (that._clientAlreadyVoted(song, clientId)) {
                                return false;
                            }

                            song.requests.push(new Jukeboxer.Request(clientId, clientName));
                            Jukeboxer.playlist.addActivity(clientName, 'vote', song);
                        }

                        // From the touched song, move up
                        for (var i = index; i > that.getProperty('currentIndex') + 1; i--) {
                            var earlierSong = that.songs.getAt(i - 1);

                            if (song.requests.length > earlierSong.requests.length) {
                                that.songs.move(i, i - 1);
                            } else {
                                break; // song has stopped moving
                            }
                        }

                        return true;
                    });
                },

            _clientAlreadyVoted:
                function (song, clientId) {
                    for (var i = 0; i < song.requests.length; i++) {
                        if (song.requests.getAt(i).id === clientId) {
                            return true;
                        }
                    }

                    return false;
                },

            removeSongs:
                function (indicesToRemove) {
                    // Sort descendingly to properly delete items from an array
                    indicesToRemove.sort(function (x, y) { return y - x; });

                    for (var i = 0; i < indicesToRemove.length; i++) {
                        var index = indicesToRemove[i];

                        if (index === this.getProperty("currentIndex")) {
                            this.next();
                        }

                        this.songs.splice(index, 1);
                    }

                    this.stateHandler();
                },

            getSongIndexFromId:
                function (id) {
                    for (var i = this.currentIndex + 1; i < this.songs.length; i++) {
                        var song = this.songs.getAt(i);

                        if (song.id === id) {
                            return i;
                        }
                    }

                    return undefined;
                },

            save:
                function (saveLocation, filename, playlistType) {
                    var playlist = new Windows.Media.Playlists.Playlist();

                    this.songs.forEach(function (song) {
                        playlist.files.append(song.file);
                    });

                    var plFormat = Windows.Media.Playlists.PlaylistFormat.windowsMedia;

                    if (playlistType === "ZPL File") {
                        plFormat = Windows.Media.Playlists.PlaylistFormat.zune;
                    } else if (playlistType === "M3U File") {
                        plFormat = Windows.Media.Playlists.PlaylistFormat.m3u;
                    }

                    return playlist.saveAsAsync(saveLocation,
                        filename,
                        Windows.Storage.NameCollisionOption.replaceExisting,
                        plFormat);
                },

            load:
                function (file) {
                    var that = this;

                    // We can only add songs that exist in the repertoire
                    // As we identify playlist songs by their internal ID, which is then used by the voting system
                    return Jukeboxer.repertoire.init().then(function () {
                        return Windows.Media.Playlists.Playlist.loadAsync(file);
                    }).then(function (playlist) {
                        var promises = [];

                        // Wrap promises so as to insert songs in setlist in the same order as the playlist (because of async calls, it can get out of order)
                        for (var i = 0; i < playlist.files.length; i++) {
                            (function (j) {
                                promises[j] = Jukeboxer.repertoire.getSongByPath(playlist.files.getAt(j).path);
                            })(i);
                        }

                        return WinJS.Promise.join(promises);
                    }).then(function (dbSongs) {
                        var promises = [];

                        // Wrap promises so as to insert songs in setlist in the same order as the playlist (because of async calls, it can get out of order)
                        for (var i = 0; i < dbSongs.length; i++) {
                            (function (j) {
                                promises[j] = Jukeboxer.SetlistSong.fromDb(dbSongs[j]);
                            })(i);
                        }

                        return WinJS.Promise.join(promises);
                    }).then(function (songs) {
                        songs.forEach(function (song) {
                            if (song) {
                                that.songs.push(song);
                            } // if not, then song wasn't found in repertoire (not in library, or repertoire not synced)
                        });

                        that.stateHandler();
                    });
                },

            play:
                function () {
                    if (this.audioControl.paused) {
                        if (this.audioControl.src !== "" && this.audioControl.src !== "ms-appx://8842marvynleroy.jukeboxer/") {
                            this.audioControl.play();
                            this.setProperty("playPauseChar", pauseChar);
                            Windows.Media.MediaControl.isPlaying = true;
                        } else {
                            return this.playSongFromIndex(0);
                        }
                    } else {
                        // When playing, 'Play' pauses.
                        this.pause();
                    }

                    return new WinJS.Promise.wrap();
                },

            playSongFromIndex:
                function (index) {
                    if (index >= 0 && index < this.songs.length) {
                        this.setProperty("currentIndex", index);

                        // For some reason, the setProperty above doesn't trigger the binded handler on currentIndex, so call it explicitly here
                        this.stateHandler();

                        var song = this.songs.getAt(index)
                        return this.playSong(song);
                    }
                },

            playSong:
                function (song) {

                    var that = this;

                    return song.getFileUrl().then(function (fileUrl) {
                        // App song
                        var curSong = that.getProperty("currentSong");
                        if (!curSong || curSong.path !== song.path) {
                            that.setProperty("currentSong", song);
                        }

                        // Media controls song
                        Windows.Media.MediaControl.artistName = song.artist;
                        Windows.Media.MediaControl.trackName = song.title;

                        that.audioControl.src = fileUrl;
                        that.audioControl.play();
                        that.setProperty("playPauseChar", pauseChar);
                        Windows.Media.MediaControl.isPlaying = true;
                    });
                },

            previous:
                function () {
                    if (Windows.Media.MediaControl.isPlaying && this.audioControl.currentTime > previousTrackThreshold) {
                        this.audioControl.currentTime = 0;
                    } else {
                        this.playSongFromIndex(this.getProperty("currentIndex") - 1);
                    }
                },

            next:
            function () {
                this.playSongFromIndex(this.getProperty("currentIndex") + 1);
            },

            pause:
            function () {
                this.audioControl.pause();
                this.setProperty("playPauseChar", playChar);
                Windows.Media.MediaControl.isPlaying = false;
            },

            stop:
            function () {
                this.pause();

                // ignore for now, as there are a couple of complex scenarios when resetting the playlist
                //if (this.audioControl.src !== "") {
                //    this.audioControl.pause();
                //    this.audioControl.currentTime = 0;
                //    this.setProperty("playPauseChar", playChar);
                //    this.setProperty("currentSong", new Jukeboxer.Song());
                //}

                //Windows.Media.MediaControl.isPlaying = false;
            },

            seek:
            function (value) {
                // The duration is NaN if a song hasn't been loaded in the audio control.
                if (!isNaN(this.audioControl.duration)) {
                    var newTime = Math.floor(value * this.audioControl.duration);
                    this.audioControl.currentTime = newTime;
                }
            },

            rewind:
            function () {
                this.audioControl.currentTime -= 15;
            },

            forward:
            function () {
                this.audioControl.currentTime += 15;
            },

            getSongsForWeb:
            function () {
                var songs = [];

                for (var i = 0; i < this.songs.length; i++) {
                    var song = this.songs.getAt(i);
                    songs.push(song.getForWeb());
                }

                return songs;
            }
        });

    WinJS.Class.mix(Playlist,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties(
        {
            previousDisabled: true,
            playPauseDisabled: true,
            nextDisabled: true,
            playPauseChar: playChar,
            currentIndex: 0,
            currentTime: 0,
            currentSong: new Jukeboxer.SetlistSong()
        }));

    WinJS.Namespace.define("Jukeboxer", {
        Playlist: Playlist
    });
})();
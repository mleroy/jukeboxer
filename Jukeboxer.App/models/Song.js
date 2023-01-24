(function () {
    "use strict";

    var SetlistSong = WinJS.Class.derive(Song,
        function () {
            this.artist = "";
            this.album = "";
            this.title = "";
            this.thumbnailUrl = Song.defaultThumbnailUrl;
            this.file = undefined;

            this.requests = new WinJS.Binding.List();
        },
        {
            getFileUrl: function () {
                return Windows.Storage.StorageFile.getFileFromPathAsync(this.path).then(function (file) {
                    return URL.createObjectURL(file, { oneTimeOnly: true });
                });
            },

            getThumbnailUrl: function () {
                var that = this;

                if (this.thumbnailUrl === Song.defaultThumbnailUrl) {
                    return this.file.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.musicView, 256)
                        .then(function (thumbnail) {
                            that.thumbnailUrl = URL.createObjectURL(thumbnail, { oneTimeOnly: false });
                            return that.thumbnailUrl;
                        });
                } else {
                    return WinJS.Promise.wrap(this.thumbnailUrl);
                }
            },

            getForWeb:
                function () {
                    return {
                        id: this.id,
                        title: this.title,
                        artist: this.artist,
                        album: this.album,
                        duration: this.duration,
                        requests: this.requests.length
                    };
                }
        },
        {
            fromRepertoire: function (repertoireSong) {
                var song = new SetlistSong();

                song.id = repertoireSong.id;
                song.path = repertoireSong.path;
                song.artist = repertoireSong.artist;
                song.title = repertoireSong.title;
                song.album = repertoireSong.album;
                song.duration = repertoireSong.duration;

                return new WinJS.Promise(function (complete, error) {
                    Windows.Storage.StorageFile.getFileFromPathAsync(song.path)
                        .then(function (file) {
                            song.file = file;
                            complete(song);
                        });
                });
            },

            fromDb:
                function (storageItem) {
                    var song = new SetlistSong();

                    song.id = storageItem.id;
                    song.path = storageItem.path;
                    song.artist = storageItem.artist;
                    song.title = storageItem.title;
                    song.album = storageItem.album;
                    song.trackNumber = storageItem.trackNumber;

                    song.duration = storageItem.duration / 1000;

                    if (song.artist == "") song.artist = "Unknown artist";
                    if (song.album == "") song.album = "Unknown album";
                    if (song.title == "") song.title = "Unknown title";
                    if (song.trackNumber == 0) song.trackNumber = '';

                    return new WinJS.Promise(function (complete, error) {
                        Windows.Storage.StorageFile.getFileFromPathAsync(song.path)
                            .then(function (file) {
                                song.file = file;
                                complete(song);
                            });
                    });
                },

            fromPlaylist:
                function (playlistFile) {
                    var song = new SetlistSong();

                    song.id = -1; // todo: don't use id on server
                    song.path = playlistFile.path;
                    song.file = playlistFile;

                    return new WinJS.Promise(function (complete, error) {
                        playlistFile.properties.getMusicPropertiesAsync().then(function (musicProperties) {
                            song.artist = musicProperties.artist;
                            song.title = musicProperties.title;
                            song.album = musicProperties.album;
                            song.duration = musicProperties.duration / 1000;

                            complete(song);
                        });
                    });
                }
        });

    var RepertoireSong = WinJS.Class.derive(Song,
        function () {
        },
        {
        },
        {
            fromStorage:
                function (storageItem) {
                    var song = new RepertoireSong();
                    var prop = storageItem.data.musicProperties;

                    song.id = storageItem.data.id;
                    song.path = storageItem.data.path;
                    song.artist = prop.artist;
                    song.title = prop.title;
                    song.album = prop.album;
                    song.trackNumber = prop.trackNumber;

                    song.duration = prop.duration / 1000;

                    if (song.artist == "") song.artist = "Unknown artist";
                    if (song.album == "") song.album = "Unknown album";
                    if (song.title == "") song.title = "Unknown title";
                    if (song.trackNumber == 0) song.trackNumber = '';

                    return song;
                },

            getThumbnailUrlForAlbumItem:
                function (albumItem) {
                    if (albumItem.thumbnailUrl === Song.defaultThumbnailUrl) {
                        return Windows.Storage.StorageFile.getFileFromPathAsync(albumItem.firstSongPath)
                            .then(function (file) {
                                return file.getThumbnailAsync(Windows.Storage.FileProperties.ThumbnailMode.musicView, 24);
                            })
                            .then(function (thumbnail) {
                                return URL.createObjectURL(thumbnail, { oneTimeOnly: true });
                            });
                    } else {
                        // Not used for now as I can't find an efficient way to revoke object URLs from the repertoire data source
                        debugger;
                        return WinJS.Promise.wrap(albumItem.thumbnailUrl);
                    }
                },

            dbItemToWeb:
                function (dbItem) {
                    return {
                        id: dbItem.id,
                        title: dbItem.title,
                        artist: dbItem.artist,
                        album: dbItem.album,
                        duration: dbItem.duration,
                        trackNumber: dbItem.trackNumber
                    };
                }
        });

    var Song = WinJS.Class.define(
        function () {
            this.artist = "Unknown artist";
            this.album = "Unknown album";
            this.title = "Unknown title";
            this.duration = 0;
            this.trackNumber = '';
            this.path = '';
        },
        {
        },
        {
            defaultThumbnailUrl: "/images/DefaultAlbumArt_256.png"
        });

    WinJS.Namespace.define("Jukeboxer", {
        RepertoireSong: RepertoireSong,
        SetlistSong: SetlistSong
    });
})();
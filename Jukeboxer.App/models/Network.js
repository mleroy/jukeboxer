(function () {
    "use strict";

    var baseUrl = 'ws://www.jukebxr.com/WebSocketHandler.ashx';

    var Network = WinJS.Class.define(
        function () {
            var that = this;

            this._initObservable();

            this.setProperty("state", Network.States.Disconnected);

            Jukeboxer.playlist.songs.oniteminserted = function (e) {
                var song = e.detail.value;

                if (that._messageWebSocket) {
                    that.sendMessage('AddSong', { song: song.getForWeb() });
                }
            };

            Jukeboxer.playlist.songs.onitemremoved = function (e) {
                if (that._messageWebSocket) {
                    that.sendMessage('RemoveSong', { index: e.detail.index });
                }
            };

            WinJS.Binding.bind(Jukeboxer.playlist, {
                currentIndex: function (index) {
                    if (that._messageWebSocket) {
                        that.sendMessage('UpdateCurrentIndex', { currentIndex: index });
                    }
                }
            });

            WinJS.Binding.bind(Jukeboxer.dancefloor,
                {
                    name: function (name) {
                        if (name && that.state === Network.States.Ready) {
                            that.sendMessage('UpdateName', { name: name });
                        }
                    }
                });
        },
        {
            _messageWebSocket: undefined,
            _messageWriter: undefined,

            connect:
                function () {

                    var that = this;

                    return new WinJS.Promise(function (complete, errorCallback) {
                        // Detect internet connectivity
                        var level = Jukeboxer.Utils.GetNetworkConnectivityLevel();

                        if (level < Windows.Networking.Connectivity.NetworkConnectivityLevel.internetAccess) {
                            errorCallback();
                            return;
                        }

                        if (!that._messageWebSocket) {
                            // Set up the socket data format and callbacks
                            var webSocket = new Windows.Networking.Sockets.MessageWebSocket();
                            webSocket.control.messageType = Windows.Networking.Sockets.SocketMessageType.utf8;
                            webSocket.onmessagereceived = function (args) { that._onMessageReceived.call(that, args); };
                            webSocket.onclosed = function (args) { that._onClosed.call(that, args); };

                            var uri = new Windows.Foundation.Uri(baseUrl);

                            console.log("Connecting to: " + uri.absoluteUri);

                            webSocket.connectAsync(uri).done(function () {

                                console.log("Connected");

                                that._messageWebSocket = webSocket;
                                // The default DataWriter encoding is utf8.
                                that._messageWriter = new Windows.Storage.Streams.DataWriter(webSocket.outputStream);

                                that.setProperty("state", Network.States.Connected);
                                complete();
                            }, function (error) {
                                var errorStatus = Windows.Networking.Sockets.WebSocketError.getStatus(error.number);
                                console.log("Cannot connect to the server: " + error);

                                that.setProperty("state", Network.States.ConnectionFailed);
                                errorCallback(errorStatus);
                            });
                        }
                        else {
                            console.log("Already Connected");
                            complete();
                        }
                    });
                },

            identify:
                function (key, name) {
                    var that = this;

                    return new WinJS.Promise(function (successCallback, errorCallback) {
                        that.connect().then(
                            function () {
                                Network.identifyResponseHandler = function (success) {
                                    if (success) {
                                        successCallback();
                                    } else {
                                        errorCallback();
                                    }
                                };

                                if (that.state === Network.States.Ready) {
                                    // This was called just to update the key, we're already connected and initialized
                                    that.sendMessage('UpdateKey', { key: key });
                                } else {
                                    that.sendMessage('Identify', { key: key, name: name }).then(function () {
                                        that.init();
                                    });
                                }
                            },

                            function (errorCode) {
                                var msg = "";
                                var title = "";

                                if (errorCode === undefined) {
                                    msg = "Couldn't connect to the Internet. Make sure you have full Internet access and try again. If the problem persists, contact us (via the Settings charm, tap 'Feedback').";
                                    title = "Internet? :(";
                                } else {
                                    msg = "Couldn't connect to the Jukeboxer server, please try again in a few minutes (error code: " + errorCode + "). If the problem persists, contact us (via the Settings charm, tap 'Feedback').";
                                    title = "Problem :(";
                                }

                                var errorDlg = new Windows.UI.Popups.MessageDialog(msg, title);

                                errorDlg.commands.append(new Windows.UI.Popups.UICommand("Try again", null, 'tryAgain'));
                                errorDlg.commands.append(new Windows.UI.Popups.UICommand("Close"));

                                errorDlg.defaultCommandIndex = 0;
                                errorDlg.cancelCommandIndex = 1;
                                errorDlg.showAsync().then(function (command) {
                                    if (command.id === 'tryAgain') {
                                        // Give it some time to breathe
                                        WinJS.UI.Animation.fadeIn(appProgressBar).then(function () {
                                            return WinJS.Promise.timeout(1500);
                                        }).then(function () {
                                            return WinJS.UI.Animation.fadeOut(appProgressBar);
                                        }).then(function () {
                                            that.identify(key, name).then(successCallback, errorCallback);
                                        });
                                    }
                                });
                            });
                    });
                },

            init:
                function () {
                    var that = this;

                    return this.sendMessage('Initialize', {
                        setlist: Jukeboxer.playlist.getSongsForWeb(),
                        currentIndex: Jukeboxer.playlist.currentIndex,
                    }).then(function () {
                        return that.sendCatalog();
                    }).then(function () {
                        that.setProperty("state", Network.States.Ready);
                    });
                },

            sendCatalog:
                function () {
                    if (!this._messageWebSocket) {
                        // A sync operation asked to refresh the server, but we're not connected
                        return;
                    }

                    var that = this;
                    return Jukeboxer.repertoire.init().then(function() {
                        return that.sendMessage('ResetCatalog');
                    }).then(function () {
                        return Jukeboxer.repertoire.getSongsForWeb();
                    }).then(function (repertoireSongs) {
                        var p = [];
                        var progressAmount = Math.floor(repertoireSongs.length / 500) + 1;

                        for (var i = 0; i < repertoireSongs.length; i += 500) {
                            var songsToSend = repertoireSongs.slice(i, i + 500);
                            p.push(that.sendMessage('CatalogChunk', {
                                chunk: songsToSend
                            }));
                        }

                        return WinJS.Promise.join(p);
                    });
                },

            _onMessageReceived:
                function (args) {
                    try {
                        var dataReader = args.getDataReader();
                        var msg = dataReader.readString(dataReader.unconsumedBufferLength);
                        var data = JSON.parse(msg);

                        if (data.action === "IdentifyResult") {
                            if (Network.identifyResponseHandler) {
                                Network.identifyResponseHandler(data.data);
                                Network.identifyResponseHandler = undefined;
                            }
                        } else if (data.action === "vote") {
                            if (!data.data.clientName) {
                                return false; // Should not happen
                            }

                            Jukeboxer.playlist.vote(data.data.songId, data.data.clientId, data.data.clientName).then(function (worked) {
                                if (worked) {
                                    // TODO: on an add/vote, don't resend the whole playlist but only broadcast the event which will be interpreted by each client
                                    Jukeboxer.network.sendMessage('UpdateSetlist', { songs: Jukeboxer.playlist.getSongsForWeb(), currentIndex: Jukeboxer.playlist.currentIndex });
                                }
                            });
                        } else if (data.action === "AddClient") {
                            // Occurs when a client sets up a name
                            // We announce it if it's a new client only
                            if (Jukeboxer.dancefloor.clients[data.data.id] === undefined) {
                                Jukeboxer.playlist.addActivity(data.data.name, 'client join');
                            }

                            Jukeboxer.dancefloor.clients[data.data.id] = data.data.name;
                        } else if (data.action === "client disconnect") {
                            // If we delete the client now, the next re-join will re-announce it
                            // Make the decision that clients are announced once per party only.
                            //delete Jukeboxer.dancefloor.clients[data.id];
                        }
                    } catch (ex) {
                        this.closeSocket();

                        this.setProperty("state", Network.States.ConnectionFailed);
                    }
                },

            sendMessage:
                function (method, data) {
                    var that = this;
                    return new WinJS.Promise(function (complete, error, progress) {
                        var payload = method + "(" + (data ? JSON.stringify(data) : "") + ")";

                        if (that._messageWriter) {
                            that._messageWriter.writeString(payload);
                            that._messageWriter.storeAsync().then(complete, error || that._sendError);
                        }
                    });
                },

            _sendError:
                function (x) {
                    // Seems to return "Unknown runtime error" -- nothing I can do
                },

            _onClosed:
                function (args) {
                    this._closeSocketCore();
                },

            closeSocket:
                function () {
                    this._closeSocketCore(1000, "Closed due to user request.");
                },

            _closeSocketCore:
                function (closeCode, closeStatus) {
                    if (this._messageWebSocket) {
                        if (closeCode && closeStatus) {
                            this._messageWebSocket.close(closeCode, closeStatus);
                        } else {
                            this._messageWebSocket.close();
                        }

                        this._messageWebSocket = null;
                    }

                    if (this._messageWriter) {
                        this._messageWriter.close();
                        this._messageWriter = null;
                    }
                }
        },
        {
            States: { "Disconnected": 0, "Connecting": 1, "Connected": 2, "Ready": 3, "ConnectionFailed": 4 },
            _errorCodes: { "NoInternet": 0, "RemoteError": 1 },

            identifyResponseHandler: undefined,
        });

    WinJS.Class.mix(Network,
        WinJS.Binding.mixin,
        WinJS.Binding.expandProperties(
        {
            state: Network.States.Disconnected
        }));

    WinJS.Namespace.define("Jukeboxer", {
        Network: Network
    });
})();
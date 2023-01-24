/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
(function () {

    /************************************************
    * The IndexedDBDataAdapter enables you to work
    * with a HTML5 IndexedDB database.
    *************************************************/

    var IndexedDbDataAdapter = WinJS.Class.define(
        function (dbName, dbVersion, objectStoreName, upgrade, error) {
            this._dbName = dbName;  // database name
            this._dbVersion = dbVersion;  // database version
            this._objectStoreName = objectStoreName; // object store name
            this._upgrade = upgrade; // database upgrade script
            this._error = error || function (evt) { console.log(evt.message); };
            this._searchKeywords = [];
        },
        {
            setSearchKeywords: function (kw) {
                var keywords = kw.toLowerCase().match(/[^ ]+/g);

                this._searchKeywords = keywords === null ? [] : keywords;
                return this._notificationHandler.invalidateAll();
            },

            setSearchableFields: function (fields) {
                this._searchableFields = fields;
            },

            _searchableFields: [],

            _itemSearchableFn: undefined,

            _isSearch:
                function () {
                    return this._searchKeywords.length > 0 && this._searchableFields.length > 0;
                },

            /*******************************************
            *  IListDataAdapter Interface Methods
            ********************************************/

            getCount: function () {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore().then(function (store) {
                        if (!that._isSearch()) {
                            var reqCount = store.count();
                            reqCount.onerror = that._error;
                            reqCount.onsuccess = function (evt) {
                                complete(evt.target.result);
                            };
                        } else {
                            var resultsIndices = [];
                            var index = 0;

                            var req = store.openCursor();
                            req.onerror = that._error;
                            req.onsuccess = function (evt) {
                                var cursor = evt.target.result;

                                if (cursor) {
                                    if (that._itemSearchableFn === undefined || that._itemSearchableFn(cursor.value)) {
                                        var keywords = that._searchKeywords.slice();

                                        // Loop each keyword
                                        for (var j = keywords.length - 1; j >= 0; j--) {

                                            // Loop through each field
                                            for (var i = 0; i < that._searchableFields.length; i++) {
                                                if (cursor.value[that._searchableFields[i]].toLowerCase().indexOf(keywords[j]) > -1) {
                                                    keywords.splice(j, 1);
                                                    break;
                                                }
                                            }
                                        }

                                        if (keywords.length == 0) {
                                            resultsIndices.push(index);
                                        }
                                    }

                                    cursor.continue();
                                    index++;
                                    return;
                                }

                                that._resultsIndices = resultsIndices;
                                complete(resultsIndices.length);
                            }
                        }
                    });
                });
            },

            _resultsIndices: [],

            itemsFromIndex: function (requestIndex, countBefore, countAfter) {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that.getCount().then(function (count) {
                        if (requestIndex >= count && count > 0) { // Even when count is 0, the ListView makes a request for index 0.
                            return WinJS.Promise.wrapError(new WinJS.ErrorFromName(WinJS.UI.FetchError.doesNotExist));
                        }

                        // Indices for traversing the store
                        var startIndex, endIndex;

                        if (that._isSearch()) {
                            startIndex = Math.max(that._resultsIndices[0], that._resultsIndices[requestIndex - countBefore]);
                            endIndex = Math.min(that._resultsIndices[count - 1] + 1, that._resultsIndices[requestIndex + countAfter] + 1);

                            // If requestIndex + countAfter goes too far, that._resultsIndices returns "NaN", which is considered the minimal number
                            // Need to manually overwrite endIndex in that case
                            if (isNaN(endIndex)) {
                                endIndex = that._resultsIndices[count - 1] + 1;
                            }

                            // Index for traversing results
                            var resultIndex = Math.max(0, requestIndex - countBefore);
                        } else {
                            startIndex = Math.max(0, requestIndex - countBefore);
                            endIndex = Math.min(count, requestIndex + countAfter + 1);
                        }

                        that._getObjectStore().then(function (store) {
                            var index = 0;
                            var items = [];
                            var req = store.openCursor();

                            req.onerror = that._error;
                            req.onsuccess = function (evt) {
                                var cursor = evt.target.result;

                                // For the initial placement of the cursor. Doesn't get called after that.
                                if (index < startIndex) {
                                    index = startIndex;
                                    cursor.advance(index);
                                    return;
                                }

                                // Add current item if we haven't gone past the end (endIndex is exclusive)
                                if (cursor && index < endIndex) {
                                    items.push({
                                        key: cursor.value[store.keyPath].toString(),
                                        data: cursor.value
                                    });

                                    // For search, need to advance by potentially more than one position.
                                    // Note that if we have reached the last search item, we still want to continue to the next item
                                    // As it will trigger the onsuccess handler which will complete the promise (bypassing this block of code)
                                    if (that._isSearch() && resultIndex < that._resultsIndices.length - 1) {
                                        resultIndex++;
                                        var advanceOffset = that._resultsIndices[resultIndex] - index;

                                        index = that._resultsIndices[resultIndex];
                                        cursor.advance(advanceOffset);
                                    } else {
                                        index++;
                                        cursor.continue();
                                    }

                                    return;
                                }

                                var offset;

                                if (that._isSearch()) {
                                    offset = requestIndex - Math.max(0, requestIndex - countBefore);
                                } else {
                                    offset = requestIndex - startIndex;
                                }

                                var results = {
                                    items: items,
                                    offset: offset,
                                    totalCount: count
                                };

                                complete(results);
                            };
                        });
                    });
                });
            },

            insertAtEnd: function (unused, data) {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore("readwrite").done(function (store) {
                        var reqAdd = store.add(data);
                        reqAdd.onerror = that._error;
                        reqAdd.onsuccess = function (evt) {
                            var reqGet = store.get(evt.target.result);
                            reqGet.onerror = that._error;
                            reqGet.onsuccess = function (evt) {
                                var newItem = {
                                    key: evt.target.result[store.keyPath].toString(),
                                    data: evt.target.result
                                }
                                complete(newItem);
                            };
                        };
                    });
                });
            },

            setNotificationHandler: function (notificationHandler) {
                this._notificationHandler = notificationHandler;
            },

            /*****************************************
            *  IndexedDbDataSource Method
            ******************************************/

            removeInternal: function (key) {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore("readwrite").done(function (store) {
                        var reqDelete = store.delete(key);
                        reqDelete.onerror = that._error;
                        reqDelete.onsuccess = function (evt) {
                            that._notificationHandler.removed(key.toString());
                            complete();
                        };
                    });
                });
            },

            nuke: function () {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore("readwrite").done(function (store) {
                        var reqClear = store.clear();
                        reqClear.onerror = that._error;
                        reqClear.onsuccess = function (evt) {
                            that._notificationHandler.reload();
                            complete();
                        };
                    });
                });
            },

            itemFromKey: function (key) {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore().done(function (store) {
                        var reqGet = store.get(key);
                        reqGet.onerror = that._error;
                        reqGet.onsuccess = function (item) {
                            complete(item);
                        };
                    });
                });
            },

            itemFromProperty: function (property, value) {
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._getObjectStore().then(function (store) {
                        var req = store.openCursor();
                        req.onerror = that._error;
                        req.onsuccess = function (evt) {
                            var cursor = evt.target.result;

                            if (cursor) {
                                if (cursor.value[property] === value) {
                                    complete(cursor.value);
                                    return;
                                }

                                cursor.continue();
                                return;
                            }

                            complete();
                        }
                    });
                });
            },

            /*******************************************
            *  Private Methods
            ********************************************/

            _ensureDbOpen: function () {
                var that = this;

                // Try to get cached Db
                if (that._cachedDb) {
                    return WinJS.Promise.wrap(that._cachedDb);
                }

                // Otherwise, open the database
                return new WinJS.Promise(function (complete, error, progress) {
                    var reqOpen = window.indexedDB.open(that._dbName, that._dbVersion);
                    reqOpen.onerror = function (evt) {
                        error();
                    };
                    reqOpen.onupgradeneeded = function (evt) {
                        that._upgrade(evt);
                        that._notificationHandler.invalidateAll();
                    };
                    reqOpen.onsuccess = function () {
                        that._cachedDb = reqOpen.result;
                        complete(that._cachedDb);
                    };
                });
            },

            _getObjectStore: function (type) {
                type = type || "readonly";
                var that = this;
                return new WinJS.Promise(function (complete, error) {
                    that._ensureDbOpen().then(function (db) {
                        var transaction = db.transaction(that._objectStoreName, type);
                        complete(transaction.objectStore(that._objectStoreName));
                    });
                });
            }

        }
    );

    var IndexedDbDataSource = WinJS.Class.derive(
        WinJS.UI.VirtualizedDataSource,
        function (dbName, dbVersion, objectStoreName, upgrade, error) {
            this._adapter = new IndexedDbDataAdapter(dbName, dbVersion, objectStoreName, upgrade, error);
            this._baseDataSourceConstructor(this._adapter);
        },
        {
            nuke: function () {
                this._adapter.nuke();
            },

            remove: function (key) {
                return this._adapter.removeInternal(key);
            },

            itemFromKey: function (key) {
                return this._adapter.itemFromKey(key);
            },

            itemFromProperty: function (property, value) {
                return this._adapter.itemFromProperty(property, value);
            },

            setSearchKeyword: function (kw) {
                return this._adapter.setSearchKeywords(kw);
            },

            setSearchableFields: function (fields) {
                this._adapter.setSearchableFields(fields);
            },

            setItemSearchableFn: function (fn) {
                this._adapter._itemSearchableFn = fn;
            },

            isSearch: function () {
                return this._adapter._isSearch();
            }
        }
    );

    WinJS.Namespace.define("DataSources", {
        IndexedDbDataSource: IndexedDbDataSource
    });

})();
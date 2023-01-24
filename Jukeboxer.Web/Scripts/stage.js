/// <reference path="../scripts/jquery-1.8.2.js" />

$(function () {

    // 
    // 2) Burn down 'stage' variable on page load

    // Socket message handlers
    $.extend(jukeboxerSocket, {
        updateCurrentIndex: function (newIndex) {
            state.CurrentIndex = newIndex;
            render();
        },

        updateSetlist: function (setlist, currentIndex) {
            state.Setlist = setlist;
            state.CurrentIndex = currentIndex;
            render();
        },

        addSong: function (song) {
            state.Setlist.push(song);
            render(); // TODO: optimize
        },

        removeSong: function (setlistIndex) {
            state.Setlist.splice(setlistIndex, 1);
            render(); // TODO: optimize
        },

        appDisconnect: function () {
            state.Setlist = [];
            state.CurrentIndex = -1;

            render();
        }
    });
});

function render() {
    var stage = document.getElementById('stage');

    if (state.Setlist.length > 0 && state.CurrentIndex >= 0) {
        var song = state.Setlist[state.CurrentIndex];

        if (document.getElementById('currentSong') === null) {
            var stageHtml = '';

            stageHtml += '<table><tr><td><img id="albumArt" src="/images/DefaultAlbumArt_128.png" /></td><td>';
            stageHtml += '<div id="currentSong"><div id="currentArtist">' + song.Artist + '</div><div id="currentTitle">' + song.Title + '</div><div id="currentAlbum">' + song.Album + '</div></div>';
            stageHtml += '</td></tr></table>';

            stage.innerHTML = stageHtml;
        } else {
            var currentArtist = document.getElementById('currentArtist');
            var currentTitle = document.getElementById('currentTitle');
            var currentAlbum = document.getElementById('currentAlbum');

            currentArtist.innerText = song.Artist;
            currentTitle.innerText = song.Title;
            currentAlbum.innerText = song.Album;
        }
    } else {
        stage.innerHTML = '<p>Stage is currently empty</p>';
    }

    var setlistContainer = document.getElementById('setlistContainer');

    if (state.Setlist.length > 0) {

        if (document.getElementById('setlist') === null) {
            setlistContainer.innerHTML = '<ul id="setlist"></ul>';
        }

        var html = '';

        var beginIndex = Math.max(0, state.CurrentIndex - 2);

        for (var i = beginIndex; i < state.Setlist.length; i++) {
            var song = state.Setlist[i];

            var playlistItemClass = i < state.CurrentIndex ? ' class="pastSong"' : ''
            var thumbClass = client.votes.indexOf(song.Id) < 0 ? 'not_voted' : '';
            var requestsString = song.Requests > 0 ? song.Requests + ' vote' + (song.Requests > 1 ? 's' : '') : '';

            html += '<li' + playlistItemClass + '>';

            if (i < state.CurrentIndex) {
                html += '<div class="iconFiller">&nbsp;</div>';
            } else if (i == state.CurrentIndex) {
                html += '<img class="nowPlaying" src="/images/notes_32.png"/ >';
            } else {
                html += '<a class="thumbUp" href="#" onclick="javascript:vote(this, ' + song.Id + '); return false;"><img class="' + thumbClass + '" src="/images/ThumbUp_32.png" /></a>';
            }

            html += '<div class="playlistTitle">' + song.Title + '</div>';
            html += '<div class="playlistRequests">' + requestsString + '</div>';
            html += '<br />';
            html += '<div class="playlistArtist">' + song.Artist + '</div>';
            html += '<hr class="soft"/>';
            html += '</li>';
        }

        var setlist = document.getElementById('setlist');
        setlist.innerHTML = html;
    } else {
        setlistContainer.innerHTML = "<p>No songs currently on the set list</p>";
    }
}
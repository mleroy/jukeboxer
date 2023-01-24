var jukeboxerSocket = {};

function identify() {
    return jukeboxerSocket.identifyClient(client.name);
}

function getUserFromCookie() {
    var i, cookie, cookies = window.document.cookie.split(';'), val;

    for (i = 0; i < cookies.length; i++) {
        cookie = cookies[i].split('=');

        if (cookie.length === 2) {
            val = cookie[1].trim();
            val = val === "" || val === "null" ? null : val;

            switch (cookie[0].trim()) {
                case "name":
                    client.name = val;
                    break;
                case "id":
                    client.id = val;
                    break;
            }
        }
    }
}

function setUserCookie() {
    if (client.name) {
        document.cookie = "name=" + client.name;
    }
    document.cookie = "id=" + client.id;
}

function submitName(submitCallback) {
    var name = document.getElementById('nameInput').value;
    document.getElementById('namePopup').style.display = 'none';

    if (name) {
        client.name = name;

        setUserCookie();
        document.getElementById('clientName').innerText = client.name;

        identify().done(function () {
            if (submitCallback) {
                submitCallback();
            }
        });
    }
}

function showPopup(submitCallback) {
    document.getElementById('nameInput').addEventListener('keypress', function (evt) {
        if (evt.keyCode === 13) {
            submitName(submitCallback);
        }
    }, false);

    document.getElementById('submitName').addEventListener('click', function () {
        submitName(submitCallback);
    }, false);

    document.getElementById('namePopup').style.display = 'block';
    document.getElementById('nameInput').focus();
}

function changeClientNameClickHandler() {
    showPopup();

    return false;
}


function vote(thumbLinkEl, id, fromCatalog) {
    var sendVote = function () {
        var thumbEl = thumbLinkEl.querySelector('.not_voted');
        if (thumbEl) {
            $(thumbEl).removeClass("not_voted");
            if (fromCatalog) {
                thumbEl.src = '/images/check_21.png';
            }
        }

        client.votes.push(id);

        return jukeboxerSocket.vote(id);
    };

    if (client.votes.indexOf(id) < 0) {
        if (!client.name || client.name === "null") {
            showPopup(function () {
                if (client.name && client.name !== "null") {
                    sendVote();
                }
            });
        } else {
            sendVote();
        }
    }
}

function connectionReady() {
    jukeboxerSocket.updateKey = function (newKey) {
        window.location = '/' + newKey;
    };

    jukeboxerSocket.updateName = function (newName) {
        document.getElementById('partyName').innerText = newName;
    };
}

$(function () {
    getUserFromCookie();

    if (!client.id) {
        client.id = Math.random().toString(36).substr(2, 7);
        setUserCookie();
    }

    document.getElementById('changeClientName').addEventListener('click', changeClientNameClickHandler);

    jukeboxerSocket = $.connection.jukeboxer;

    jukeboxerSocket.PartyKey = state.PartyKey;

    $.connection.hub.start()
        .done(function () {
            jukeboxerSocket.identifyClient(client.name)
                .done(connectionReady);
        })
        .fail(function () {
            alert("Could not connect to party. Refresh the page to try again.");
        });
});
<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Catalog.aspx.cs" Inherits="Jukeboxer.Web.Stage" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title><%=Party.Name %></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/Content/bootstrap.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/m-buttons.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/m-icons.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/styles.css" type="text/css" />
    <link rel="stylesheet" href="/Content/jukeboxer.css" />
</head>
<body>
    <div id="namePopup">
        <div class="inner">
            <p>Please enter your name</p>
            <div class="form">
                <input type="text" id="nameInput" />
                <a href="#" id="submitName">
                    <i class="m-icon-big-swapright m-icon-white"></i>
                </a>
            </div>
        </div>
    </div>

    <div class="navbar">
        <div class="navbar-inner">
            <div class="container">
                <a href="/" class="brand">
                    <img src="/Images/headerlogo.png" /></a>
                <ul class="nav">
                    <li><a href="/<%=Party.Key %>">Stage</a></li>
                    <li class="active"><a href="/<%=Party.Key %>/add">Catalog</a></li>
                </ul>
            </div>
        </div>
    </div>

    <header class="header">
        <div class="container">
            <h3 id="partyName"><%=Party.Name %></h3>
            <div id="stage">
                <% if (Party.Catalog.Count == 0)
                   {
                %><p>No song in catalog</p>
                <%
                   } %>
            </div>
        </div>
    </header>

    <section class="container">
        <br />

        <% if (Party.Catalog.Count > 0)
           {
        %>
        <ul id="catalog">
            <% var lastArtist = "";
               var lastAlbum = "";
               var clientVotes = ClientVotes;

               for (int i = 0; i < Party.Catalog.Count; i++)
               {
                   var song = Party.Catalog[i];
                   var imgSrc = clientVotes.Contains(song.Id) ? "check_21.png" : "plus_21.png";
                   var thumbClass = clientVotes.Contains(song.Id) ? "" : "not_voted";

                   var seconds = Math.Floor(decimal.Parse(song.Duration) % 60);
                   var formattedDuration = Math.Floor(decimal.Parse(song.Duration) / 60) + ":" + (seconds < 10 ? "0" : "") + seconds;
            %>
            <li><%
                   if (lastArtist != song.Artist)
                   {
                       lastArtist = song.Artist;
            %><div class="artist"><%=song.Artist %></div>
                <%
                   }

                   if (lastAlbum != song.Album)
                   {
                       lastAlbum = song.Album;
                %><div class="album"><%=song.Album %></div>
                <%
               }
                %>
                <div class="song">
                    <a class="thumbUp" href="#" onclick="javascript:vote(this, <%=song.Id %>, true); return false;">
                        <img class="<%=thumbClass %>" src="/images/<%=imgSrc %>" /></a>
                    <span class="trackNumber"><%=song.TrackNumber %></span>
                    <span class="title"><%=song.Title%></span>
                    <span class="duration"><%=formattedDuration%></span>
                </div>
                <%
                %></li>
            <%
               } %>
        </ul>
        <%
           }
        %>

        <a class="m-btn purple rnd fixeddone" href="/<%=Party.Key %>"><i class="m-icon-swapleft m-icon-white"></i> Done</a>

        <hr class="soft" />
    </section>

    <section class="container">
        <div class="row">
            <div class="span12 center">
                <div class="row">
                    &copy; Jukeboxer 2013 - you are <span id="clientName"><%=ClientName %></span> (<a href="#" id="changeClientName">change</a>)
                </div>
            </div>
        </div>
    </section>

    <script type="text/javascript">
        var client = {
            votes: [<%= ClientVotesJSON %>]
        };

        <%="var state = " + SerializeState() + ";"%>
    </script>
    <script src="/Scripts/jquery-1.8.2.min.js"></script>
    <script src="/Scripts/jquery.signalR-0.5.3.min.js"></script>
    <script src="/signalr/hubs"></script>
    <script src="/Scripts/common.js"></script>
</body>
</html>

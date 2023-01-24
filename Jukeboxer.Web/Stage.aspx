<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Stage.aspx.cs" Inherits="Jukeboxer.Web.Stage" %>

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
                    <li class="active"><a href="/<%=Party.Key %>">Stage</a></li>
                    <li><a href="/<%=Party.Key %>/add">Catalog</a></li>
                </ul>
            </div>
        </div>
    </div>

    <header class="header">
        <div class="container">
            <h3 id="partyName"><%=Party.Name %></h3>
            <div id="stage">
                <% if (Party.Setlist.Count > 0 && Party.CurrentIndex >= 0)
                   {
                       var song = Party.Setlist[Party.CurrentIndex];
                %><%
                %><table>
                    <tr>
                        <td>
                            <img id="albumArt" src="/images/DefaultAlbumArt_128.png" />
                        </td>
                        <td>
                            <div id="currentSong">
                                <div id="currentArtist"><%= song.Artist %></div>
                                <div id="currentTitle"><%= song.Title %></div>
                                <div id="currentAlbum"><%= song.Album %></div>
                            </div>
                        </td>
                    </tr>
                </table>
                <%
                %><%
                   }
                   else
                   {
                %><p>Stage is currently empty</p>
                <%
                   } %>
            </div>
        </div>
    </header>

    <section class="container">
        <br />
        <h3 id="setlistHeader">coming up</h3>
        <div id="setlistContainer">
            <% if (Party.Setlist.Count > 0)
               {
            %><div id="voteInstruction">
                Vote for songs with
            <img src="/images/ThumbUp.png" class="not_voted" style="margin: 0; padding-bottom: 10px;" />
            </div>

            <ul id="setlist">
                <% var beginIndex = Math.Max(0, Party.CurrentIndex - 2);
                   var clientVotes = ClientVotes;

                   for (int i = beginIndex; i < Party.Setlist.Count; i++)
                   {
                       var song = Party.Setlist[i];
                       var thumbClass = clientVotes.Contains(song.Id) ? "" : "not_voted";
                       var playlistItemClass = i < Party.CurrentIndex ? "pastSong" : "";
                %>
                <li class="<%=playlistItemClass %>"><%
                       if (i > Party.CurrentIndex)
                       {
                %><a class="thumbUp" href="#" onclick="javascript:vote(this, <%=song.Id %>); return false;">
                    <img class="<%=thumbClass %>" src="/images/ThumbUp_32.png" />
                </a><%
                       }
                       else if (i == Party.CurrentIndex)
                       {
                %><img class="nowPlaying" src="/images/notes_32.png" /><%
                       }
                       else
                       {
                %><div class="iconFiller">&nbsp;</div>
                    <%
                       }
                    %>
                    <div class="playlistTitle"><%=song.Title %></div>
                    <div class="playlistRequests">
                        <% if (song.Requests > 0)
                           { %>
                        <%=string.Format("{0} vote{1}", song.Requests, song.Requests > 1 ? "s" : "")%>
                        <% } %>
                    </div>
                    <br />
                    <div class="playlistArtist"><%=song.Artist %></div>
                    <hr class="soft" />
                    <%
                    %></li>
                <%
                   } %>
            </ul>
            <%
               }
               else
               {
            %><p>No songs currently on the set list</p>
            <%
               }%>
        </div>

        <div class="row">
            <div class="span12">
                <div class="action-button">
                    <a class="m-btn big purple rnd" href="/<%=Party.Key %>/add">Add new songs! <i class="m-icon-big-swapright m-icon-white"></i></a>
                </div>
            </div>
        </div>
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
    <script src="/Scripts/stage.js"></script>
</body>
</html>

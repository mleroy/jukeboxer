<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Dashboard.aspx.cs" Inherits="Jukeboxer.Web.Dashboard" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head id="Head1" runat="server">
    <title>Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/Content/bootstrap.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/m-buttons.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/m-icons.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/styles.css" type="text/css" />
    <link rel="stylesheet" href="/Content/jukeboxer.css" />
</head>
<body>

    <div class="navbar">
        <div class="navbar-inner">
            <div class="container">
                <a href="/" class="brand">
                    <img src="/Images/headerlogo.png" /></a>
            </div>
        </div>
    </div>

    <header class="header">
        <div class="container">
            <h3>Current parties</h3>
            <ul>
                <% foreach (var party in Parties.OrderByDescending(p => p.StartTime))
                   {
                %><li>
                    <h4><% if (Request.QueryString["marvyn"] != null)
                           {
                    %><a href="/<%=party.Key%>" target="_blank"><%=party.Name%></a><%
                           }
                           else
                           {
                    %><%=party.Name%><%
                           } %></h4>
                    <%
                    %><div>
                        <div>
                            <img src="/images/notes_32.png" />
                            <%
                           if (party.CurrentIndex >= 0)
                       {
                            %><b><%=party.Setlist[party.CurrentIndex].Title %></b> by <b><%=party.Setlist[party.CurrentIndex].Artist %></b><%
                       }
                           else
                           {
                            %>No song currently playing<%
                           } %>
                        </div>
                        <div>
                            <% if (party.Clients.Count > 0)
                               {
                                   var clients = party.Clients.Take(3);

                                   for (int i = 0; i < clients.Count(); i++)
                                   {
                                       var clientName = clients.ElementAt(i).Value.Name;

                                       if (i > 0)
                                       {
                            %>, <%
                                       }

                                       if (string.IsNullOrEmpty(clientName))
                                       {
                            %>Anonymous<%
                                       }
                                       else
                                       {
                            %><span><%= clientName%></span><%
                                       }
                                   }
                            %>
                        </div>
                        <%
                               }
                               else
                               {
                        %><p>The dancefloor is empty!</p>
                        <%
                               }%>
                    </div>
                </li>
                <%
                   } %>
            </ul>
        </div>
    </header>

    <section class="container">
        <br />
        <h1>Party log</h1>

        <ul>
            <%
                foreach (var x in PartyLog.Take(50))
                {
            %><li><%=x%></li>
            <%
                } %>
        </ul>
        <h1>Client log</h1>

        <ul>
            <%
                foreach (var x in ClientLog.Take(50))
                {
            %><li><%=x%></li>
            <%
                } %>
        </ul>
    </section>

    <script src="/Scripts/jquery-1.8.2.min.js"></script>
</body>
</html>

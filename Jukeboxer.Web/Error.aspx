<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Error.aspx.cs" Inherits="Jukeboxer.Web.ErrorPage" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">

<head runat="server">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Jukeboxer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/Content/bootstrap.min.css" type="text/css" />
    <link rel="stylesheet" href="/Content/styles.css" type="text/css" />
</head>
<body>
    <div class="navbar">
        <div class="navbar-inner">
            <div class="container">
                <a href="/" class="brand">
                    <img src="/Images/headerlogo.png" /></a>
                <ul class="nav">
                    <li class="active"><a href="/">Back to home</a></li>
                </ul>
            </div>
        </div>
    </div>

    <header class="header">
        <div class="container">
            <div class="row">
                <h3>Problem :(</h3>

                <p>The party you're trying to join doesn't exist.</p>
                <p>Make sure you have the right URL and try again.</p>
            </div>
        </div>
    </header>
</body>
</html>

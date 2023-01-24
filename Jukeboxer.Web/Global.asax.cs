using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Routing;
using System.Web.Security;
using Jukeboxer.Web;
using SignalR;

namespace Jukeboxer.Web
{
    public class Global : HttpApplication
    {
        void Application_Start(object sender, EventArgs e)
        {
            GlobalHost.DependencyResolver.Register(typeof(IConnectionIdGenerator), () => new ConnectionFactory());
        }

        void Application_End(object sender, EventArgs e)
        {
            //  Code that runs on application shutdown

        }

        void Application_Error(object sender, EventArgs e)
        {
            Server.Transfer("~/Error.aspx");
        }
    }
}

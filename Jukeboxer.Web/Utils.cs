using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Web;
using System.Web.Script.Serialization;

namespace Jukeboxer.Web
{
    public class Utils
    {
        static JavaScriptSerializer _serializer = new JavaScriptSerializer();

        public static void SendToApp(WebSocket socket, object msg) {
            string serialized = _serializer.Serialize(msg);
            var arr = new ArraySegment<byte>(Encoding.UTF8.GetBytes(serialized));
            socket.SendAsync(arr, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}
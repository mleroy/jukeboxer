using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Web;

namespace Jukeboxer.Web
{
    public class Party
    {
        public string Name { get; set; }
        public string Key { get; set; }
        public int CurrentIndex;
        public Dictionary<string, Client> Clients { get; set; }
        public List<Song> Setlist { get; set; }
        public List<Song> Catalog { get; set; }
        public DateTime StartTime { get; set; }
        public WebSocket Socket { get; set; }

        public Party(WebSocket socket, string key, string name)
        {
            this.Socket = socket;
            this.Key = key;
            this.Name = name;

            this.CurrentIndex = -1;
            this.Clients = new Dictionary<string, Client>();
            this.Setlist = new List<Song>();
            this.Catalog = new List<Song>();
            this.StartTime = DateTime.Now;
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jukeboxer.Web
{
    public class Client
    {
        public string Name { get; set; }
        public string Id { get; set; }
        public List<int> Votes { get; set; }

        public Client(string id, string name)
        {
            this.Id = id;
            this.Name = name;
            this.Votes = new List<int>();
        }
    }
}
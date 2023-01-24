using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jukeboxer.Web
{
    public class Song
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Artist { get; set; }
        public string Album { get; set; }
        public string Duration;
        public int Requests { get; set; }
        public string TrackNumber { get; set; }
    }
}
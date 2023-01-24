using Microsoft.WindowsAzure.Storage.Table;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jukeboxer.Web.Models
{
    public class LogEntity : TableEntity
    {
        public LogEntity(string type)
        {
            this.PartitionKey = type;
            this.RowKey = DateTime.UtcNow.Ticks.ToString("d19");
        }

        public LogEntity() { }

        public string Data { get; set; }
    }
}
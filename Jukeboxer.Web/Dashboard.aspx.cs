using Jukeboxer.Web.Models;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Table;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace Jukeboxer.Web
{
    public partial class Dashboard : System.Web.UI.Page
    {
        private readonly CloudStorageAccount _storageAccount = CloudStorageAccount.Parse(
            Microsoft.WindowsAzure.CloudConfigurationManager.GetSetting("Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString"));
        private Jukeboxer _jukeboxer;

        public List<String> PartyLog { get; set; }
        public List<String> ClientLog { get; set; }

        protected void Page_Load(object sender, EventArgs e)
        {
            _jukeboxer = Jukeboxer.Instance;

            CloudTableClient tableClient = _storageAccount.CreateCloudTableClient();

            CloudTable table = tableClient.GetTableReference("log");

            TableQuery<LogEntity> query = new TableQuery<LogEntity>().Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, "Party"));

            PartyLog = new List<string>();

            var results = from r in table.ExecuteQuery(query)
                          orderby r.RowKey descending
                          select new { Time = new DateTime(long.Parse(r.RowKey)), Data = r.Data };

            foreach (var entity in results)
            {
                PartyLog.Add(string.Format("{0}: {1}", entity.Time, entity.Data));
            }

            query = new TableQuery<LogEntity>().Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, "Client"));

            ClientLog = new List<string>();

            results = from r in table.ExecuteQuery(query)
                      orderby r.RowKey descending
                      select new { Time = new DateTime(long.Parse(r.RowKey)), Data = r.Data };

            foreach (var entity in results)
            {
                ClientLog.Add(string.Format("{0}: {1}", entity.Time, entity.Data));
            }
        }

        protected List<Party> Parties
        {
            get
            {
                return _jukeboxer.GetParties();
            }
        }
    }
}
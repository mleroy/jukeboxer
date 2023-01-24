using Jukeboxer.Web.Models;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Table;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Jukeboxer.Web
{
    public class Logger
    {
        private readonly CloudStorageAccount _storageAccount = CloudStorageAccount.Parse(
            Microsoft.WindowsAzure.CloudConfigurationManager.GetSetting("Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString"));

        private CloudTable logTable { get; set; }

        public Logger()
        {
            // Create the table client.
            CloudTableClient tableClient = _storageAccount.CreateCloudTableClient();

            // Create the table if it doesn't exist.
            logTable = tableClient.GetTableReference("log");
            logTable.CreateIfNotExists();
        }

        void InsertLogEntity(string type, string format, params object[] values)
        {
            LogEntity logEntity = new LogEntity(type);
            logEntity.Data = string.Format(format, values);

            TableOperation insertOperation = TableOperation.Insert(logEntity);

            logTable.Execute(insertOperation);
        }

        internal void AddParty(string key, string name)
        {
            InsertLogEntity("Party", "Add: Key: {0} Name: {1}", key, name);
        }

        internal void UpdateKey(string oldKey, string newKey)
        {
            InsertLogEntity("Party", "UpdateKey: Old: {0} New: {1}", oldKey, newKey);
        }

        internal void UpdateName(string partyKey, string newName)
        {
            InsertLogEntity("Party", "UpdateName: Party: {0} newName: {1}", partyKey, newName);
        }

        internal void RemoveParty(string partyKey)
        {
            InsertLogEntity("Party", "Remove: Party: {0}", partyKey);
        }

        internal void ClientJoin(string partyKey, string clientId, string clientName)
        {
            InsertLogEntity("Client", "Join: Party:{0}: clientId: {1} clientName: {2}", partyKey, clientId, clientName);
        }

        internal void ClientNameUpdate(string partyKey, string clientId, string oldName, string newName)
        {
            InsertLogEntity("Client", "NameUpdate: Party: {0} clientId: {1} oldName: {2} newName: {3}", partyKey, clientId, oldName, newName);
        }

        internal void ClientLeave(string partyKey, string clientId)
        {
            InsertLogEntity("Client", "Leave: Party: {0} ClientId: {1}", partyKey, clientId);
        }

        internal void ClientVote(string partyKey, string clientId, int songId)
        {
            InsertLogEntity("Client", "Vote: Party: {0} ClientId: {1} SongId: {2}", partyKey, clientId, songId);
        }
    }
}
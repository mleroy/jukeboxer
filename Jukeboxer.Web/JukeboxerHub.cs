using SignalR.Hubs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Jukeboxer.Web
{
    [HubName("jukeboxer")]
    public class JukeboxerHub : Hub, IConnected, IDisconnect
    {
        private readonly Jukeboxer _jukeboxer;

        public JukeboxerHub() : this(Jukeboxer.Instance) { }

        public JukeboxerHub(Jukeboxer jukeboxer)
        {
            _jukeboxer = jukeboxer;
        }

        public List<Party> GetParties()
        {
            return _jukeboxer.GetParties();
        }

        public void IdentifyClient(string name)
        {
            //Groups.Add(Context.ConnectionId, Caller.PartyKey);

            _jukeboxer.AddPartyClient(Caller.PartyKey, Context.ConnectionId, name);
        }

        public void Vote(int songId)
        {
            _jukeboxer.Vote(Caller.PartyKey, Context.ConnectionId, songId);
        }

        #region IConnected, IDisconnect interface implementations

        public Task Disconnect()
        {
            // If we remove the party client, the list of votes is lost. 
            // Seems like we should not remove clients to preserve state across refresh for clients.
            //var partyKey = _jukeboxer.RemovePartyClient(Context.ConnectionId);
            return null;// Groups.Remove(Context.ConnectionId, partyKey);
        }

        public Task Connect()
        {
            return null;
        }

        public Task Reconnect(IEnumerable<string> groups)
        {
            return null;
        }

        #endregion
    }
}
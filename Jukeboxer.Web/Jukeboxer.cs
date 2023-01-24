using Jukeboxer.Web.Models;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Auth;
using Microsoft.WindowsAzure.Storage.Table;
using SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Net.WebSockets;
using System.Web;

namespace Jukeboxer.Web
{
    public class Jukeboxer
    {
        private readonly static Lazy<Jukeboxer> _instance = new Lazy<Jukeboxer>(() => new Jukeboxer());

        private readonly ConcurrentDictionary<string, Party> _parties = new ConcurrentDictionary<string, Party>(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, string> _clientIds = new ConcurrentDictionary<string, string>();

        Logger logger;

        private Jukeboxer()
        {
            logger = new Logger();
        }

        public static Jukeboxer Instance
        {
            get
            {
                return _instance.Value;
            }
        }

        public List<Party> GetParties()
        {
            return _parties.Values.ToList();
        }

        public Party GetParty(string key)
        {
            Party party = null;

            _parties.TryGetValue(key, out party);

            return party;
        }

        public bool KeyExists(string key)
        {
            return _parties.ContainsKey(key);
        }

        public bool AddParty(WebSocket socket, string key, string name)
        {
            logger.AddParty(key, name);

            var party = new Party(socket, key, name);
            return _parties.TryAdd(party.Key, party);
        }

        public bool UpdateKey(string oldKey, string newKey)
        {
            logger.UpdateKey(oldKey, newKey);

            if (_parties.ContainsKey(newKey))
            {
                return false;
            }

            Party party = null;

            _parties.TryRemove(oldKey, out party);
            party.Key = newKey;

            _parties.TryAdd(newKey, party);

            // Move and notify clients
            foreach (var client in party.Clients)
            {
                GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].updateKey(newKey);
                _clientIds[client.Key] = newKey;
            }

            return true;
        }

        public bool UpdateName(string partyKey, string newName)
        {
            logger.UpdateName(partyKey, newName);

            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                if (!party.Name.Equals(newName))
                {
                    party.Name = newName;
                    return true;
                }

                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].updateName(newName);
                }
            }

            return false;
        }

        public void UpdateCurrentIndex(string partyKey, int currentIndex)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.CurrentIndex = currentIndex;

                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].updateCurrentIndex(currentIndex);
                }
            }
        }

        public void UpdatePartySetlist(string partyKey, List<Song> setlist, int currentIndex)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.Setlist = setlist;
                party.CurrentIndex = currentIndex < party.Setlist.Count ? currentIndex : party.Setlist.Count - 1;

                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].updateSetlist(setlist, currentIndex);
                }
            }
        }

        public void ResetPartyCatalog(string partyKey)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.Catalog.Clear();
            }
        }

        public void AddToPartyCatalog(string partyKey, List<Song> chunk)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.Catalog.AddRange(chunk);
            }
        }

        public void AddSong(string partyKey, Song song)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.Setlist.Add(song);

                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].addSong(song);
                }
            }
        }

        public void RemoveSong(string partyKey, int index)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                party.Setlist.RemoveAt(index);

                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].removeSong(index);
                }
            }
        }

        public void RemoveParty(string partyKey)
        {
            logger.RemoveParty(partyKey);

            Party party = null;
            if (_parties.TryRemove(partyKey, out party))
            {
                // Notify clients
                foreach (var client in party.Clients)
                {
                    GlobalHost.ConnectionManager.GetHubContext<JukeboxerHub>().Clients[client.Key].appDisconnect();
                }
            }
        }

        public void AddPartyClient(string partyKey, string clientId, string clientName)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party) && !string.IsNullOrEmpty(clientId))
            {
                _clientIds.TryAdd(clientId, party.Key);

                if (!party.Clients.ContainsKey(clientId))
                {
                    var client = new Client(clientId, clientName);
                    party.Clients.Add(client.Id, client);

                    logger.ClientJoin(partyKey, clientId, clientName);
                }
                else
                {
                    logger.ClientNameUpdate(partyKey, clientId, party.Clients[clientId].Name, clientName);

                    party.Clients[clientId].Name = clientName;
                }

                // We'll notify the app of the client join only when there's a name.
                // In the mean time, the client will still receive setlist updates by registering on the server
                if (!string.IsNullOrEmpty(clientName))
                {
                    object packet = new { action = "AddClient", data = new { id = clientId, name = clientName } };
                    Utils.SendToApp(party.Socket, packet);
                }
            }
        }

        public string RemovePartyClient(string clientId)
        {
            string partyKey = null;

            if (_clientIds.ContainsKey(clientId))
            {
                _clientIds.TryRemove(clientId, out partyKey);

                if (!string.IsNullOrEmpty(partyKey))
                {
                    var party = GetParty(partyKey);
                    party.Clients.Remove(clientId);

                    logger.ClientLeave(partyKey, clientId);
                }
            }

            return partyKey;
        }

        public void Vote(string partyKey, string clientId, int songId)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                if (party.Clients.ContainsKey(clientId))
                {
                    party.Clients[clientId].Votes.Add(songId);

                    var packet = new
                    {
                        action = "vote",
                        data = new
                        {
                            songId = songId,
                            clientId = clientId,
                            clientName = party.Clients[clientId].Name
                        }
                    };

                    Utils.SendToApp(party.Socket, packet);

                    logger.ClientVote(partyKey, clientId, songId);
                }
            }
        }

        public List<int> GetClientVotes(string partyKey, string clientId)
        {
            Party party = null;
            if (_parties.TryGetValue(partyKey, out party))
            {
                if (party.Clients.ContainsKey(clientId))
                {
                    return party.Clients[clientId].Votes;
                }
            }

            return new List<int> { };
        }
    }
}
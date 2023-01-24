using Microsoft.Web.WebSockets;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.Script.Serialization;

namespace Jukeboxer.Web
{
    #region Serialization data types

    public class IdentifyDataType
    {
        public string Key;
        public string Name;
    }

    public class InitializeDataType
    {
        public List<Song> Setlist;
        public List<Song> Catalog;
        public int CurrentIndex;
    }

    public class CatalogChunkDataType
    {
        public List<Song> Chunk;
    }

    public class UpdateCurrentIndexDataType
    {
        public int CurrentIndex;
    }

    public class UpdateNameDataType
    {
        public string Name;
    }

    public class UpdateKeyDataType
    {
        public string Key;
    }

    public class AddSongDataType
    {
        public Song Song;
    }

    public class RemoveSongDataType
    {
        public int Index;
    }

    public class UpdateSetlistDataType
    {
        public List<Song> Songs;
        public int CurrentIndex;
    }

    public class IdentifyResultDataType
    {
        public string action;
        public bool data;
    }

    #endregion

    public class MyWebSocketHandler : WebSocketHandler
    {
        static JavaScriptSerializer _serializer = new JavaScriptSerializer();
        readonly Jukeboxer _jukeboxer = Jukeboxer.Instance;
        string _partyKey = null;

        public override void OnMessage(string message)
        {
            var match = Regex.Match(message, @"^(?<Method>[a-zA-Z]+)\((?<Data>.*)\)$");
            if (match.Groups["Method"].Success && match.Groups["Data"].Success)
            {
                var method = match.Groups["Method"].Value;
                var data = match.Groups["Data"].Value;

                var type = this.GetType();
                var methodToInvoke = type.GetMethod(method);

                object[] parameters = null;

                if (!string.IsNullOrEmpty(data))
                {
                    // Generate parameters from JSON
                    var dataType = Type.GetType("Jukeboxer.Web." + method + "DataType");
                    parameters = new object[]
                    {
                      _serializer.Deserialize(data, dataType)
                    };
                }

                methodToInvoke.Invoke(this, parameters);

            }
        }

        public override void OnOpen()
        {
            base.OnOpen();
        }

        public override void OnClose()
        {
            _jukeboxer.RemoveParty(_partyKey);
            base.OnClose();
        }

        public override void OnError()
        {
            base.OnError();
        }

        public void Identify(IdentifyDataType data)
        {
            var response = new IdentifyResultDataType { action = "IdentifyResult", data = false };

            if (_jukeboxer.AddParty(WebSocketContext.WebSocket, data.Key, data.Name))
            {
                _partyKey = data.Key;
                response.data = true;
            }

            Utils.SendToApp(WebSocketContext.WebSocket, response);
        }

        public void Initialize(InitializeDataType data)
        {
            _jukeboxer.UpdatePartySetlist(_partyKey, data.Setlist, data.CurrentIndex);
        }

        public void ResetCatalog()
        {
            _jukeboxer.ResetPartyCatalog(_partyKey);
        }

        public void CatalogChunk(CatalogChunkDataType data)
        {
            _jukeboxer.AddToPartyCatalog(_partyKey, data.Chunk);
        }

        public void UpdateName(UpdateNameDataType data)
        {
            _jukeboxer.UpdateName(_partyKey, data.Name);
        }

        public void UpdateKey(UpdateKeyDataType data)
        {
            var response = new IdentifyResultDataType { action = "IdentifyResult", data = false };

            if (_jukeboxer.UpdateKey(_partyKey, data.Key))
            {
                _partyKey = data.Key;
                response.data = true;
            }

            Utils.SendToApp(WebSocketContext.WebSocket, response);
        }

        public void AddSong(AddSongDataType data)
        {
            _jukeboxer.AddSong(_partyKey, data.Song);
        }

        public void RemoveSong(RemoveSongDataType data)
        {
            _jukeboxer.RemoveSong(_partyKey, data.Index);
        }

        public void UpdateCurrentIndex(UpdateCurrentIndexDataType data)
        {
            _jukeboxer.UpdateCurrentIndex(_partyKey, data.CurrentIndex);
        }

        public void UpdateSetlist(UpdateSetlistDataType data)
        {
            _jukeboxer.UpdatePartySetlist(_partyKey, data.Songs, data.CurrentIndex);
        }
    }

    public class WSHttpHandler : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            if (context.IsWebSocketRequest)
            {
                context.AcceptWebSocketRequest(new MyWebSocketHandler());
            }
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}
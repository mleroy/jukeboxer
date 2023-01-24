using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.Script.Serialization;

namespace Jukeboxer.Web
{
    public partial class Stage : System.Web.UI.Page
    {
        private Jukeboxer _jukeboxer;

        public Party Party;

        protected void Page_Load(object sender, EventArgs e)
        {
            var partyKey = Request.QueryString["key"];

            if (partyKey == null)
            {
                throw new ArgumentNullException("key");
            }

            _jukeboxer = Jukeboxer.Instance;

            Party = _jukeboxer.GetParty(partyKey);

            if (Party == null)
            {
                throw new ArgumentException("Party " + partyKey + " doesn't exist");
            }
        }

        public string ClientName
        {
            get
            {
                var name = Request.Cookies["name"];
                return name != null && !string.IsNullOrEmpty(name.Value) ? name.Value : "Anonymous";
            }
        }

        public string SerializeState()
        {
            var state = new
            {
                PartyKey = Party.Key,
                Setlist = Party.Setlist,
                CurrentIndex = Party.CurrentIndex
            };

            var serializer = new JavaScriptSerializer();
            return serializer.Serialize(state);
        }

        public string ClientVotesJSON
        {
            get
            {
                return string.Join(",", this.ClientVotes);
            }
        }

        public List<int> ClientVotes
        {
            get
            {
                var clientId = Request.Cookies["id"];

                if (clientId != null)
                {
                    return _jukeboxer.GetClientVotes(Party.Key, clientId.Value);
                }

                return new List<int> {};
            }
        }
    }
}
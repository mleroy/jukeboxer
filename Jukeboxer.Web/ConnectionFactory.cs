using SignalR;
using System;

namespace Jukeboxer.Web
{
    public class ConnectionFactory : IConnectionIdGenerator
    {
        public string GenerateConnectionId(IRequest request)
        {
            if (request.Cookies["id"] != null)
            {
                return request.Cookies["id"].Value;
            }
            
            return Guid.NewGuid().ToString();
        }
    }
}
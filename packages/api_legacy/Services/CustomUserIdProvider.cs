using Microsoft.AspNetCore.SignalR;

namespace Backend.Services
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
        {
            return connection.User?.FindFirst("PharmacyId")?.Value;
        }
    }
}
